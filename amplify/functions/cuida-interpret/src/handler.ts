import type { Schema } from '../../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

import type { CuidaManualScoring, CuidaFindings } from './types';
import { validateProfile } from './validity';
import { computeQualitativeLevels } from './qualitative';
import { evaluateDeseabilidad } from './deseabilidad';
import { detectJointReadingFlags } from './joint-reading';
import { computeCriticalItemFlags } from './critical-items';
// El clasificador de "estilo de crianza" se retiró: el CUIDA no tiene una escala
// de estilos educativos; el manual solo permite "plantear tendencias" de forma
// cualitativa (guía §9.1). Un veredicto de estilo con confianza numérica era una
// regla de decisión inventada, y su perfil "sano" exigía agresividad ALTA.

let client: ReturnType<typeof generateClient<Schema>> | null = null;

async function getClient() {
  if (client) return client;
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
    process.env as any,
  );
  Amplify.configure(resourceConfig, libraryOptions);
  client = generateClient<Schema>();
  return client;
}

interface HandlerArgs {
  sessionId: string;
}

export const handler = async (event: any): Promise<CuidaFindings> => {
  const warnings: string[] = [];

  try {
    const args: HandlerArgs =
      typeof event.arguments === 'string'
        ? JSON.parse(event.arguments)
        : event.arguments;

    const { sessionId } = args;
    if (!sessionId) return buildErrorResult('Falta sessionId', null);

    const dataClient = await getClient();

    // 1. Leer sesión y respuestas crudas
    const sessionResult = await dataClient.models.AssessmentSession.get({ id: sessionId });
    if (!sessionResult.data) return buildErrorResult('Sesión no encontrada', null);

    const session = sessionResult.data;
    let rawAnswers: number[] = [];
    if (session.answers) {
      try {
        rawAnswers =
          typeof session.answers === 'string'
            ? JSON.parse(session.answers)
            : (session.answers as number[]);
      } catch {
        /* respuestas no parseables — se usará array vacío */
      }
    }

    // 2. Leer scoring manual actual
    const scoringList = await dataClient.models.AssessmentScoring.list({
      filter: { sessionId: { eq: sessionId }, isCurrent: { eq: true } },
    });
    const scoringRecord = scoringList.data?.[0];
    if (!scoringRecord?.scores) {
      return buildErrorResult('No hay scoring manual para esta sesión. Transcriba primero los valores de TEA.', null);
    }

    let manualScoring: CuidaManualScoring;
    try {
      const raw =
        typeof scoringRecord.scores === 'string'
          ? JSON.parse(scoringRecord.scores)
          : scoringRecord.scores;

      // Si ya es CuidaFindings (reinterpretación), extraer manualScoring
      manualScoring = raw.source === 'TEA_MANUAL' ? raw : raw.manualScoring;
    } catch {
      return buildErrorResult('No se pudo parsear el scoring guardado', null);
    }

    if (!manualScoring || manualScoring.source !== 'TEA_MANUAL') {
      return buildErrorResult('El scoring actual no corresponde a una transcripción manual del CUIDA', null);
    }

    // 3. Validar perfil
    const profileValidity = validateProfile(manualScoring);

    const findings: CuidaFindings = {
      manualScoring,
      interpretationVersion: 1,
      profileValidity,
      reportMode: profileValidity.isValid ? 'COMPLETE' : 'NOT_INTERPRETABLE',
      qualitativeLevels: {},
      deseabilidadInterpretation: evaluateDeseabilidad(
        manualScoring.deseabilidadSocial,
        manualScoring.escalas,
        manualScoring.cuidado,
      ),
      jointReadingFlags: [],
      criticalItemsToClarify: [],
      generatedAt: new Date().toISOString(),
      warnings,
    };

    if (!profileValidity.isValid) {
      warnings.push(profileValidity.reason ?? 'Protocolo inválido');
      await persistFindings(dataClient, sessionId, findings, scoringRecord.version ?? 1);
      return findings;
    }

    // 4. Niveles cualitativos
    findings.qualitativeLevels = computeQualitativeLevels(
      manualScoring.escalas,
      manualScoring.cuidado,
      manualScoring.deseabilidadSocial,
    );

    // 5. Deseabilidad
    findings.deseabilidadInterpretation = evaluateDeseabilidad(
      manualScoring.deseabilidadSocial,
      manualScoring.escalas,
      manualScoring.cuidado,
    );
    if (findings.deseabilidadInterpretation.contaminationRisk) {
      warnings.push(
        `Deseabilidad social En ${manualScoring.deseabilidadSocial} ≥ 7: interpretar escalas altas con cautela`,
      );
    }

    // 6. Patrones de lectura conjunta
    findings.jointReadingFlags = detectJointReadingFlags(
      manualScoring.escalas,
      manualScoring.cuidado,
    );

    // 7. Ítems críticos del manual
    findings.criticalItemsToClarify = computeCriticalItemFlags(
      manualScoring.escalas,
      manualScoring.cuidado,
      rawAnswers,
      manualScoring.itemsCriticosTea ?? [],
    );

    findings.warnings = warnings;

    // 9. Persistir nueva versión
    await persistFindings(dataClient, sessionId, findings, scoringRecord.version ?? 1, (session as any).owner);

    return findings;
  } catch (err: any) {
    console.error('[cuida-interpret] Error inesperado:', err);
    return buildErrorResult(err.message || 'Error interno al interpretar', null);
  }
};

async function persistFindings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataClient: any,
  sessionId: string,
  findings: CuidaFindings,
  currentVersion: number,
  owner?: string,
): Promise<void> {
  // Invalidar scoring actual
  const existing = await dataClient.models.AssessmentScoring.list({
    filter: { sessionId: { eq: sessionId } },
  });
  let maxVersion = currentVersion;
  for (const item of existing.data ?? []) {
    if ((item.version ?? 0) > maxVersion) maxVersion = item.version ?? 0;
    if (item.isCurrent) {
      await dataClient.models.AssessmentScoring.update({ id: item.id, isCurrent: false });
    }
  }

  await dataClient.models.AssessmentScoring.create({
    sessionId,
    totalScore: 0,
    scores: JSON.stringify(findings),
    source: 'TEA',
    status: 'COMPLETED',
    version: maxVersion + 1,
    isCurrent: true,
    generatedAt: findings.generatedAt,
    reportMode: findings.reportMode,
  });
}

function buildErrorResult(errorMessage: string, manualScoring: CuidaManualScoring | null): CuidaFindings {
  return {
    manualScoring: manualScoring ?? ({} as CuidaManualScoring),
    interpretationVersion: 1,
    profileValidity: { isValid: false, reason: errorMessage },
    reportMode: 'NOT_INTERPRETABLE',
    qualitativeLevels: {},
    deseabilidadInterpretation: {
      en: 0,
      level: 'MEDIO',
      contaminationRisk: false,
      scalesToInterpretWithCaution: [],
    },
    jointReadingFlags: [],
    criticalItemsToClarify: [],
    generatedAt: new Date().toISOString(),
    warnings: [errorMessage],
  };
}
