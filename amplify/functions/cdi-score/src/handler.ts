import type { Schema } from '../../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

import {
  CdiScoringResult,
  ReportMode,
  Sex,
} from './types';
import {
  validateAnswers,
  correctAnswers,
  calculateRawScores,
} from './scoring';
import {
  BAREM_TOTAL,
  BAREM_DISFORIA,
  BAREM_AUTOESTIMA,
} from './baremos';
import {
  resolveAgeGroup,
  resolveTableColumn,
  lookupScore,
} from './lookup';
import { classifyTotal } from './classification';
import { analyzeItems } from './item-analysis';

const SCORING_VERSION = 2;

// Inicialización lazy del cliente de Amplify Data
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

/**
 * Handler de la query GraphQL scoreCdiSession.
 *
 * Flujo:
 * 1. Lee la AssessmentSession por ID.
 * 2. Valida que la sesión esté COMPLETED y sea del CDI.
 * 3. Valida y corrige respuestas.
 * 4. Calcula puntuaciones directas (Total, Disforia, Autoestima).
 * 5. Intenta baremar según sexo y edad congelados. Si falta alguno o la edad
 *    está fuera de rango (7-15), devuelve PARTIAL_NO_NORM.
 * 6. Clasifica el Total si hay baremación.
 * 7. Analiza ítems (flag del 9, lista de ítems con valor 2, etc.).
 * 8. Persiste el resultado en AssessmentScoring (invalida versión anterior).
 * 9. Actualiza la AssessmentSession a status SCORED.
 * 10. Devuelve el objeto estructurado.
 */
export const handler = async (event: any): Promise<CdiScoringResult> => {
  const warnings: string[] = [];

  try {
    const args: HandlerArgs =
      typeof event.arguments === 'string'
        ? JSON.parse(event.arguments)
        : event.arguments;

    const { sessionId } = args;
    if (!sessionId) {
      return buildErrorResult('Falta sessionId', 'NOT_INTERPRETABLE');
    }

    // 1. Leer la sesión
    const dataClient = await getClient();

    // 1. Leer la sesión
    const sessionResult = await dataClient.models.AssessmentSession.get({
      id: sessionId,
    });

    if (!sessionResult.data) {
      return buildErrorResult('Sesión no encontrada', 'NOT_INTERPRETABLE');
    }

    const session = sessionResult.data;

    // 2. Validar estado
    if (session.status !== 'COMPLETED') {
      return buildErrorResult(
        `La sesión debe estar completada antes de calificar (estado actual: ${session.status})`,
        'NOT_INTERPRETABLE',
      );
    }

    // Confirmar que es CDI leyendo el Assessment asociado
    const assessmentResult = await dataClient.models.Assessment.get({
      id: session.assessmentId,
    });
    if (!assessmentResult.data) {
      return buildErrorResult('Prueba no encontrada', 'NOT_INTERPRETABLE');
    }
    if (assessmentResult.data.shortName !== 'CDI') {
      return buildErrorResult(
        `Esta Lambda solo procesa CDI, recibido: ${assessmentResult.data.shortName}`,
        'NOT_INTERPRETABLE',
      );
    }

    // 3. Parsear y validar respuestas
    let rawAnswers: unknown;
    try {
      rawAnswers =
        typeof session.answers === 'string'
          ? JSON.parse(session.answers)
          : session.answers;
    } catch {
      return buildErrorResult(
        'Las respuestas no se pueden parsear',
        'NOT_INTERPRETABLE',
      );
    }

    const validationError = validateAnswers(rawAnswers);
    if (validationError) {
      return buildErrorResult(validationError, 'NOT_INTERPRETABLE');
    }

    const answers = rawAnswers as number[];

    // 4. Corrección y puntuaciones directas
    const correctedScores = correctAnswers(answers);
    const rawScores = calculateRawScores(correctedScores);

    // 7. Análisis de ítems (se hace siempre, no depende del baremo)
    const itemAnalysis = analyzeItems(correctedScores, rawScores.total);

    // 5. Baremación
    const subjectAgeYears = session.subjectAgeYears;
    const subjectSex = session.subjectSex as Sex | null | undefined;

    let reportMode: ReportMode;
    let normativeGroup = null;
    let normedScores = null;
    let totalClassification = null;

    if (subjectAgeYears == null || subjectSex == null) {
      reportMode = 'PARTIAL_INSUFFICIENT';
      warnings.push(
        'Faltan datos del evaluado (edad o sexo) al momento de completar la sesión',
      );
    } else {
      const ageGroup = resolveAgeGroup(subjectAgeYears);

      if (ageGroup === null) {
        reportMode = 'PARTIAL_NO_NORM';
        warnings.push(
          `Edad ${subjectAgeYears} años fuera del rango baremado (7-15). No se calcula baremación.`,
        );
      } else {
        const column = resolveTableColumn(subjectSex, ageGroup);

        normativeGroup = {
          sex: subjectSex,
          ageYears: subjectAgeYears,
          ageGroup,
          tableColumn: column,
        };

        const totalNormed = lookupScore(BAREM_TOTAL, column, rawScores.total);
        const disforiaNormed = lookupScore(
          BAREM_DISFORIA,
          column,
          rawScores.disforia,
        );
        const autoestimaNormed = lookupScore(
          BAREM_AUTOESTIMA,
          column,
          rawScores.autoestima,
        );

        normedScores = {
          total: totalNormed,
          disforia: disforiaNormed,
          autoestima: autoestimaNormed,
        };

        // 6. Clasificación del Total
        totalClassification = classifyTotal(totalNormed.pc);

        reportMode = 'COMPLETE';
      }
    }

    // 8. Persistir el AssessmentScoring
    const result: CdiScoringResult = {
      success: true,
      scoringVersion: SCORING_VERSION,
      reportMode,
      rawScores,
      normativeGroup,
      normedScores,
      totalClassification,
      itemAnalysis,
      generatedAt: new Date().toISOString(),
      warnings,
    };

    await persistScoring(dataClient, sessionId, result, (session as any).owner);

    // 9. Actualizar la sesión a SCORED
    await dataClient.models.AssessmentSession.update({
      id: sessionId,
      status: 'SCORED',
    });

    // 10. Devolver
    return result;
  } catch (err: any) {
    console.error('[cdi-score] Error inesperado:', err);
    return buildErrorResult(
      err.message || 'Error interno al calcular scoring',
      'NOT_INTERPRETABLE',
    );
  }
};

/**
 * Persiste el resultado en AssessmentScoring.
 * Invalida cualquier scoring anterior con isCurrent=true.
 */
async function persistScoring(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataClient: any,
  sessionId: string,
  result: CdiScoringResult,
  owner?: string,
): Promise<void> {
  // Invalidar scorings anteriores
  const existing = await dataClient.models.AssessmentScoring.list({
    filter: { sessionId: { eq: sessionId } },
  });

  let maxVersion = 0;
  if (existing.data) {
    for (const item of existing.data) {
      if (item.version > maxVersion) maxVersion = item.version;
      if (item.isCurrent) {
        await dataClient.models.AssessmentScoring.update({
          id: item.id,
          isCurrent: false,
        });
      }
    }
  }

  // Crear nuevo scoring
  await dataClient.models.AssessmentScoring.create({
    sessionId,
    totalScore: result.rawScores.total,
    scores: JSON.stringify(result),
    source: 'LOCAL',
    status: result.success ? 'COMPLETED' : 'FAILED',
    version: maxVersion + 1,
    isCurrent: true,
    generatedAt: result.generatedAt,
    scoringVersion: result.scoringVersion,
    reportMode: result.reportMode,
  });
}
/**
 * Construye una respuesta de error con estructura consistente.
 * No persiste nada.
 */
function buildErrorResult(
  errorMessage: string,
  reportMode: ReportMode,
): CdiScoringResult {
  return {
    success: false,
    scoringVersion: SCORING_VERSION,
    reportMode,
    rawScores: { total: 0, disforia: 0, autoestima: 0 },
    normativeGroup: null,
    normedScores: null,
    totalClassification: null,
    itemAnalysis: {
      item9Value: 0,
      item9Alert: false,
      itemsValue2: [],
      itemsValue1: [],
      cutoffExceeded: false,
    },
    generatedAt: new Date().toISOString(),
    warnings: [],
    error: errorMessage,
  };
}
