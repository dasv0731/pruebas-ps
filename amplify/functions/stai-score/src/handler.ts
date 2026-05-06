import type { Schema } from '../../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

import {
  StaiScoringResult,
  ReportMode,
} from './types';
import {
  validateAnswers,
  correctAnswers,
  calculateRawScores,
} from './scoring';

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
 * Handler de la query GraphQL scoreStaiSession.
 *
 * Flujo:
 * 1. Lee la AssessmentSession por ID.
 * 2. Valida que la sesión esté COMPLETED y sea del STAI.
 * 3. Valida y corrige las 40 respuestas.
 * 4. Calcula A/E y A/R.
 * 5. (Baremación y clasificación pendientes hasta tener el manual TEA).
 * 6. Persiste el resultado en AssessmentScoring (invalida versión anterior).
 * 7. Actualiza la AssessmentSession a status SCORED.
 * 8. Devuelve el objeto estructurado.
 */
export const handler = async (event: any): Promise<StaiScoringResult> => {
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

    // Confirmar que es STAI
    const assessmentResult = await dataClient.models.Assessment.get({
      id: session.assessmentId,
    });
    if (!assessmentResult.data) {
      return buildErrorResult('Prueba no encontrada', 'NOT_INTERPRETABLE');
    }
    if (assessmentResult.data.shortName !== 'STAI') {
      return buildErrorResult(
        `Esta Lambda solo procesa STAI, recibido: ${assessmentResult.data.shortName}`,
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

    // 5. Baremación: pendiente hasta disponer del manual TEA
    const reportMode: ReportMode = 'PARTIAL_NO_NORM';
    warnings.push(
      'Baremación pendiente: los baremos oficiales del STAI se agregarán cuando el manual esté disponible. Solo se devuelven puntuaciones directas.',
    );

    // 6. Construir resultado
    const result: StaiScoringResult = {
      success: true,
      scoringVersion: SCORING_VERSION,
      reportMode,
      rawScores,
      normativeGroup: null,
      normedScores: null,
      generatedAt: new Date().toISOString(),
      warnings,
    };

    // 7. Persistir AssessmentScoring
    await persistScoring(dataClient, sessionId, result);

    // 8. Actualizar sesión a SCORED
    await dataClient.models.AssessmentSession.update({
      id: sessionId,
      status: 'SCORED',
    });

    return result;
  } catch (err: any) {
    console.error('[stai-score] Error inesperado:', err);
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
  result: StaiScoringResult,
): Promise<void> {
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

  // Usamos la suma de A/E y A/R como "totalScore" en el campo compatible,
  // aunque semánticamente el STAI no tiene un "total" único. La información
  // estructurada completa está en `scores` (JSON).
  const totalScore = result.rawScores.estado + result.rawScores.rasgo;

  await dataClient.models.AssessmentScoring.create({
    sessionId,
    totalScore,
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
): StaiScoringResult {
  return {
    success: false,
    scoringVersion: SCORING_VERSION,
    reportMode,
    rawScores: { estado: 0, rasgo: 0 },
    normativeGroup: null,
    normedScores: null,
    generatedAt: new Date().toISOString(),
    warnings: [],
    error: errorMessage,
  };
}