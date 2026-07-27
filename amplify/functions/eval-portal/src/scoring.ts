/**
 * Scoring server-side para el flujo remoto del evaluado. NUNCA se confía en un
 * total calculado por el cliente: aquí se recalcula desde las respuestas.
 *
 * - STAI / STAIC: inversión de ítems (misma lógica que el frontend corregido).
 * - CDI: se reutilizan los módulos puros de la Lambda cdi-score (fuente única de
 *   verdad de la corrección: inversión + baremos TEA + clasificación + ítem 9).
 * - CUIDA / TAMAI / PAI: no se auto-puntúan en el portal (se corrigen en TEA);
 *   `computeScore` devuelve null y el handler solo marca la sesión COMPLETED.
 */
import {
  validateAnswers as validateCdiAnswers,
  correctAnswers as correctCdiAnswers,
  calculateRawScores as calculateCdiRawScores,
} from '../../cdi-score/src/scoring';
import { BAREM_TOTAL, BAREM_DISFORIA, BAREM_AUTOESTIMA } from '../../cdi-score/src/baremos';
import { resolveAgeGroup, resolveTableColumn, lookupScore } from '../../cdi-score/src/lookup';
import { classifyTotal } from '../../cdi-score/src/classification';
import { analyzeItems } from '../../cdi-score/src/item-analysis';
import {
  staicCourseGroupFromAge,
  staicLookup,
} from '../../../../src/app/features/assessments/tests/staic/staic.baremos';

export interface ComputedScore {
  totalScore: number;
  scores: any;
  scoringVersion?: number;
  reportMode?: string;
}

const STAI_INV_ESTADO = new Set([1, 2, 5, 8, 10, 11, 15, 16, 19, 20]);
const STAI_INV_RASGO = new Set([21, 26, 27, 30, 33, 36, 39]);
const STAIC_INV_ESTADO = new Set([1, 4, 6, 8, 9, 10, 11, 13, 16, 18]);

function scoreStai(answers: number[]): ComputedScore {
  let estado = 0;
  let rasgo = 0;
  for (let i = 0; i < 40; i++) {
    const item = i + 1;
    const opt = answers[i];
    let corrected = 0;
    if (Number.isInteger(opt) && opt >= 1 && opt <= 4) {
      const inverted = STAI_INV_ESTADO.has(item) || STAI_INV_RASGO.has(item);
      corrected = inverted ? 4 - opt : opt - 1;
    }
    if (item <= 20) estado += corrected;
    else rasgo += corrected;
  }
  const totalScore = estado + rasgo;
  return {
    totalScore,
    scores: {
      totalScore,
      maxScore: 120,
      percentage: Math.round((totalScore / 120) * 100),
      subscales: { 'Ansiedad Estado': estado, 'Ansiedad Rasgo': rasgo },
      details: { estadoScore: estado, rasgoScore: rasgo, estadoMax: 60, rasgoMax: 60 },
    },
  };
}

function scoreStaic(
  answers: number[],
  subjectSex: string | null | undefined,
  subjectAgeYears: number | null | undefined,
): ComputedScore {
  let estado = 0;
  let rasgo = 0;
  for (let i = 0; i < 40; i++) {
    const item = i + 1;
    const opt = answers[i];
    let corrected = 0;
    if (Number.isInteger(opt) && opt >= 1 && opt <= 3) {
      const inverted = item <= 20 && STAIC_INV_ESTADO.has(item);
      corrected = inverted ? 4 - opt : opt;
    }
    if (item <= 20) estado += corrected;
    else rasgo += corrected;
  }
  const totalScore = estado + rasgo;
  const hasNormativeData =
    (subjectSex === 'MALE' || subjectSex === 'FEMALE') && subjectAgeYears != null;
  const courseGroup = hasNormativeData ? staicCourseGroupFromAge(subjectAgeYears) : null;
  const normativeGroup = hasNormativeData
    ? {
        sex: subjectSex,
        ageYears: subjectAgeYears,
        courseGroup,
        courseGroupInferredFromAge: true,
      }
    : null;
  const normedScores = normativeGroup
    ? {
        estado: staicLookup(estado, { courseGroup: courseGroup!, sex: subjectSex as 'MALE' | 'FEMALE', scale: 'estado' }),
        rasgo: staicLookup(rasgo, { courseGroup: courseGroup!, sex: subjectSex as 'MALE' | 'FEMALE', scale: 'rasgo' }),
      }
    : null;
  return {
    totalScore,
    scores: {
      totalScore,
      maxScore: 120,
      percentage: Math.round((totalScore / 120) * 100),
      subscales: { 'Ansiedad Estado': estado, 'Ansiedad Rasgo': rasgo },
      details: { estadoScore: estado, rasgoScore: rasgo, estadoMax: 60, rasgoMax: 60 },
      normativeGroup,
      normedScores,
      warnings: [
        ...(normativeGroup ? ['El grupo de curso se infirió desde la edad; confirmar el curso escolar real.'] : ['Faltan datos del evaluado para baremar.']),
        'La clave de inversos de Ansiedad Estado debe verificarse contra el manual TEA antes de uso pericial.',
      ],
    },
  };
}

function scoreCdi(
  answers: number[],
  subjectSex: string | null | undefined,
  subjectAgeYears: number | null | undefined,
): ComputedScore {
  const validationError = validateCdiAnswers(answers);
  if (validationError) {
    throw new Error(`CDI: ${validationError}`);
  }
  const corrected = correctCdiAnswers(answers);
  const rawScores = calculateCdiRawScores(corrected);
  const itemAnalysis = analyzeItems(corrected, rawScores.total);

  let reportMode = 'PARTIAL_INSUFFICIENT';
  let normativeGroup: any = null;
  let normedScores: any = null;
  let totalClassification: any = null;
  const warnings: string[] = [];

  if (subjectAgeYears == null || subjectSex == null) {
    warnings.push('Faltan datos del evaluado (edad o sexo).');
  } else {
    const ageGroup = resolveAgeGroup(subjectAgeYears);
    if (ageGroup === null) {
      reportMode = 'PARTIAL_NO_NORM';
      warnings.push(`Edad ${subjectAgeYears} fuera del rango baremado (7-15).`);
    } else {
      const column = resolveTableColumn(subjectSex as any, ageGroup);
      normativeGroup = { sex: subjectSex, ageYears: subjectAgeYears, ageGroup, tableColumn: column };
      normedScores = {
        total: lookupScore(BAREM_TOTAL, column, rawScores.total),
        disforia: lookupScore(BAREM_DISFORIA, column, rawScores.disforia),
        autoestima: lookupScore(BAREM_AUTOESTIMA, column, rawScores.autoestima),
      };
      totalClassification = classifyTotal(normedScores.total.pc);
      reportMode = 'COMPLETE';
    }
  }

  const result = {
    success: true,
    scoringVersion: 2,
    reportMode,
    rawScores,
    normativeGroup,
    normedScores,
    totalClassification,
    itemAnalysis,
    generatedAt: new Date().toISOString(),
    warnings,
  };
  return { totalScore: rawScores.total, scores: result, scoringVersion: 2, reportMode };
}

/**
 * Calcula el scoring de la prueba. Devuelve null si la prueba no se auto-puntúa
 * en el portal (CUIDA/TAMAI/PAI → corrección en TEA).
 */
export function computeScore(
  shortName: string,
  answers: number[],
  subjectSex: string | null | undefined,
  subjectAgeYears: number | null | undefined,
): ComputedScore | null {
  switch (shortName) {
    case 'STAI':
      return scoreStai(answers);
    case 'STAIC':
      return scoreStaic(answers, subjectSex, subjectAgeYears);
    case 'CDI':
      return scoreCdi(answers, subjectSex, subjectAgeYears);
    default:
      return null;
  }
}
