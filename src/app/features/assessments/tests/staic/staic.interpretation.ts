import { InterpretationConfig, ScoringResult, ClinicalRule, AIInput } from '../../models/test.interfaces';

const CLINICAL_RULES: ClinicalRule[] = [
  {
    condition: (r) => (r.subscales?.['Ansiedad Estado'] || 0) <= 15,
    finding: 'Ansiedad estado BAJA (puntuación ≤15/60)',
    severity: 'LOW',
  },
  {
    condition: (r) => {
      const s = r.subscales?.['Ansiedad Estado'] || 0;
      return s > 15 && s <= 30;
    },
    finding: 'Ansiedad estado MODERADA (puntuación 16-30/60)',
    severity: 'MODERATE',
  },
  {
    condition: (r) => (r.subscales?.['Ansiedad Estado'] || 0) > 30,
    finding: 'Ansiedad estado ALTA (puntuación >30/60)',
    severity: 'HIGH',
  },
  {
    condition: (r) => (r.subscales?.['Ansiedad Rasgo'] || 0) <= 15,
    finding: 'Ansiedad rasgo BAJA (puntuación ≤15/60)',
    severity: 'LOW',
  },
  {
    condition: (r) => {
      const s = r.subscales?.['Ansiedad Rasgo'] || 0;
      return s > 15 && s <= 30;
    },
    finding: 'Ansiedad rasgo MODERADA (puntuación 16-30/60)',
    severity: 'MODERATE',
  },
  {
    condition: (r) => (r.subscales?.['Ansiedad Rasgo'] || 0) > 30,
    finding: 'Ansiedad rasgo ALTA (puntuación >30/60)',
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