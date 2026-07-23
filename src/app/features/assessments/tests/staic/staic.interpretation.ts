import { InterpretationConfig, ScoringResult, ClinicalRule, AIInput } from '../../models/test.interfaces';

/**
 * Bandas ORIENTATIVAS sobre la puntuación directa de cada subescala (rango 20-60).
 * NO son decatipos ni percentiles: son cortes en tercios del rango real para dar
 * una lectura preliminar mientras no se incorporen los baremos oficiales TEA del
 * STAIC (por sexo/edad). Deben sustituirse por la tabla normativa real.
 */
const CLINICAL_RULES: ClinicalRule[] = [
  {
    condition: (r) => (r.subscales?.['Ansiedad Estado'] || 0) <= 33,
    finding: 'Ansiedad estado BAJA (puntuación directa 20-33/60)',
    severity: 'LOW',
  },
  {
    condition: (r) => {
      const s = r.subscales?.['Ansiedad Estado'] || 0;
      return s > 33 && s <= 46;
    },
    finding: 'Ansiedad estado MODERADA (puntuación directa 34-46/60)',
    severity: 'MODERATE',
  },
  {
    condition: (r) => (r.subscales?.['Ansiedad Estado'] || 0) > 46,
    finding: 'Ansiedad estado ALTA (puntuación directa >46/60)',
    severity: 'HIGH',
  },
  {
    condition: (r) => (r.subscales?.['Ansiedad Rasgo'] || 0) <= 33,
    finding: 'Ansiedad rasgo BAJA (puntuación directa 20-33/60)',
    severity: 'LOW',
  },
  {
    condition: (r) => {
      const s = r.subscales?.['Ansiedad Rasgo'] || 0;
      return s > 33 && s <= 46;
    },
    finding: 'Ansiedad rasgo MODERADA (puntuación directa 34-46/60)',
    severity: 'MODERATE',
  },
  {
    condition: (r) => (r.subscales?.['Ansiedad Rasgo'] || 0) > 46,
    finding: 'Ansiedad rasgo ALTA (puntuación directa >46/60)',
    severity: 'HIGH',
  },
];

export const STAIC_INTERPRETATION: InterpretationConfig = {
  clinicalRules: CLINICAL_RULES,
  maxTokens: 500,
  systemPrompt: `Eres un psicólogo clínico forense especializado en población infantil. Genera una interpretación clínica CONCISA del STAIC para un informe pericial judicial. Máximo 250 palabras. Escribe en español.

REGLAS:
- Usa solo los datos proporcionados.
- Menciona los niveles de ansiedad estado y rasgo adaptados a población infantil.
- Interpreta la relación entre ambas escalas.
- Considera que es población infantil/adolescente.
- Concluye con la relevancia para el contexto pericial.
- Escribe en párrafos narrativos, sin encabezados ni viñetas.`,

  buildAIInput: (result: ScoringResult): AIInput => {
    const findings: string[] = [];
    for (const rule of CLINICAL_RULES) {
      if (rule.condition(result)) {
        findings.push(rule.finding);
      }
    }
    return {
      testName: 'STAIC - Inventario de Ansiedad Estado-Rasgo para Niños',
      testDescription: 'Evalúa ansiedad estado y rasgo en niños y adolescentes',
      scores: {
        'Ansiedad Estado': result.subscales?.['Ansiedad Estado'] || 0,
        'Ansiedad Rasgo': result.subscales?.['Ansiedad Rasgo'] || 0,
        'Estado máximo': 60,
        'Rasgo máximo': 60,
      },
      clinicalFindings: findings,
      context: 'Evaluación pericial judicial - población infantil',
    };
  },
};