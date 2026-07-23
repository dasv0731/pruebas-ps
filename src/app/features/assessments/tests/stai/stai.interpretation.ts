import { InterpretationConfig, ScoringResult, ClinicalRule, AIInput } from '../../models/test.interfaces';

/**
 * Bandas ORIENTATIVAS sobre la puntuación directa de cada subescala (rango 0-60).
 * NO son decatipos ni percentiles: son cortes proporcionales (25/50/75 % del rango)
 * para dar una lectura preliminar mientras no se incorporen los baremos oficiales
 * TEA (decatipos por sexo/edad). Deben sustituirse por la tabla normativa real.
 */
const CLINICAL_RULES: ClinicalRule[] = [
  {
    condition: (r) => (r.subscales?.['Ansiedad Estado'] || 0) <= 15,
    finding: 'Ansiedad estado BAJA (puntuación directa ≤15/60)',
    severity: 'LOW',
  },
  {
    condition: (r) => {
      const s = r.subscales?.['Ansiedad Estado'] || 0;
      return s > 15 && s <= 30;
    },
    finding: 'Ansiedad estado MODERADA-BAJA (puntuación directa 16-30/60)',
    severity: 'LOW',
  },
  {
    condition: (r) => {
      const s = r.subscales?.['Ansiedad Estado'] || 0;
      return s > 30 && s <= 45;
    },
    finding: 'Ansiedad estado MODERADA-ALTA (puntuación directa 31-45/60)',
    severity: 'MODERATE',
  },
  {
    condition: (r) => (r.subscales?.['Ansiedad Estado'] || 0) > 45,
    finding: 'Ansiedad estado ALTA (puntuación directa >45/60)',
    severity: 'HIGH',
  },
  {
    condition: (r) => (r.subscales?.['Ansiedad Rasgo'] || 0) <= 15,
    finding: 'Ansiedad rasgo BAJA (puntuación directa ≤15/60)',
    severity: 'LOW',
  },
  {
    condition: (r) => {
      const s = r.subscales?.['Ansiedad Rasgo'] || 0;
      return s > 15 && s <= 30;
    },
    finding: 'Ansiedad rasgo MODERADA-BAJA (puntuación directa 16-30/60)',
    severity: 'LOW',
  },
  {
    condition: (r) => {
      const s = r.subscales?.['Ansiedad Rasgo'] || 0;
      return s > 30 && s <= 45;
    },
    finding: 'Ansiedad rasgo MODERADA-ALTA (puntuación directa 31-45/60)',
    severity: 'MODERATE',
  },
  {
    condition: (r) => (r.subscales?.['Ansiedad Rasgo'] || 0) > 45,
    finding: 'Ansiedad rasgo ALTA (puntuación directa >45/60)',
    severity: 'HIGH',
  },
  {
    condition: (r) => {
      const estado = r.subscales?.['Ansiedad Estado'] || 0;
      const rasgo = r.subscales?.['Ansiedad Rasgo'] || 0;
      return estado > rasgo + 15;
    },
    finding: 'Ansiedad estado significativamente mayor que rasgo: sugiere ansiedad situacional elevada al momento de la evaluación',
    severity: 'MODERATE',
  },
  {
    condition: (r) => {
      const rasgo = r.subscales?.['Ansiedad Rasgo'] || 0;
      const estado = r.subscales?.['Ansiedad Estado'] || 0;
      return rasgo > estado + 15;
    },
    finding: 'Ansiedad rasgo significativamente mayor que estado: sugiere patrón crónico de ansiedad independiente de la situación actual',
    severity: 'MODERATE',
  },
];

export const STAI_INTERPRETATION: InterpretationConfig = {
  clinicalRules: CLINICAL_RULES,
  maxTokens: 500,
  systemPrompt: `Eres un psicólogo clínico forense. Genera una interpretación clínica CONCISA del STAI para un informe pericial judicial. Máximo 250 palabras. Escribe en español.

REGLAS:
- Usa solo los datos proporcionados, no inventes.
- Menciona los niveles de ansiedad estado y rasgo.
- Interpreta la relación entre ambas escalas.
- Si hay hallazgos clínicos relevantes, inclúyelos.
- Concluye con la relevancia para el contexto pericial.
- NO uses encabezados ni listas con viñetas. Escribe en párrafos narrativos.`,

  buildAIInput: (result: ScoringResult): AIInput => {
    const findings: string[] = [];
    for (const rule of CLINICAL_RULES) {
      if (rule.condition(result)) {
        findings.push(rule.finding);
      }
    }

    return {
      testName: 'STAI - Inventario de Ansiedad Estado-Rasgo',
      testDescription: 'Evalúa ansiedad como estado transitorio y como rasgo estable de personalidad',
      scores: {
        'Ansiedad Estado': result.subscales?.['Ansiedad Estado'] || 0,
        'Ansiedad Rasgo': result.subscales?.['Ansiedad Rasgo'] || 0,
        'Estado máximo': 60,
        'Rasgo máximo': 60,
      },
      clinicalFindings: findings,
      context: 'Evaluación pericial judicial',
    };
  },
};