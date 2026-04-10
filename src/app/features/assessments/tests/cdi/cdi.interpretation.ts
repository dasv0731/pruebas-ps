import { InterpretationConfig, ScoringResult, ClinicalRule, AIInput } from '../../models/test.interfaces';

const CLINICAL_RULES: ClinicalRule[] = [
  {
    condition: (r) => r.totalScore < 10,
    finding: 'Puntuación total BAJA (<10/54): sin indicadores significativos de sintomatología depresiva',
    severity: 'LOW',
  },
  {
    condition: (r) => r.totalScore >= 10 && r.totalScore < 19,
    finding: 'Puntuación total MODERADA (10-18/54): presencia de algunos síntomas depresivos leves',
    severity: 'MODERATE',
  },
  {
    condition: (r) => r.totalScore >= 19,
    finding: 'Puntuación total ALTA (≥19/54): SUPERA EL PUNTO DE CORTE CLÍNICO. Indica posible trastorno depresivo',
    severity: 'HIGH',
  },
  {
    condition: (r) => (r.subscales?.['Disforia (D)'] || 0) > (r.subscales?.['Autoestima Negativa (A)'] || 0) * 1.5,
    finding: 'Predominio marcado de disforia sobre autoestima negativa: el componente afectivo-emocional es más prominente',
    severity: 'MODERATE',
  },
  {
    condition: (r) => (r.subscales?.['Autoestima Negativa (A)'] || 0) > (r.subscales?.['Disforia (D)'] || 0) * 1.5,
    finding: 'Predominio de autoestima negativa sobre disforia: el componente cognitivo-autoevaluativo es más prominente',
    severity: 'MODERATE',
  },
];

export const CDI_INTERPRETATION: InterpretationConfig = {
  clinicalRules: CLINICAL_RULES,
  maxTokens: 500,
  systemPrompt: `Eres un psicólogo clínico forense especializado en población infantil. Genera una interpretación clínica CONCISA del CDI para un informe pericial judicial. Máximo 250 palabras. Escribe en español.

REGLAS:
- Usa solo los datos proporcionados.
- El punto de corte clínico es 19. Indica claramente si se supera o no.
- Interpreta las subescalas de Disforia y Autoestima Negativa.
- Considera que es población infantil (7-17 años).
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
      testName: 'CDI - Inventario de Depresión Infantil',
      testDescription: 'Evalúa síntomas depresivos en niños de 7 a 17 años',
      scores: {
        'Puntuación total': result.totalScore,
        'Máximo posible': 54,
        'Punto de corte': 19,
        'Disforia (D)': result.subscales?.['Disforia (D)'] || 0,
        'Autoestima Negativa (A)': result.subscales?.['Autoestima Negativa (A)'] || 0,
      },
      clinicalFindings: findings,
      cutoffResult: result.cutoff?.exceeded ? 'SUPERA punto de corte (≥19)' : 'NO supera punto de corte (<19)',
      context: 'Evaluación pericial judicial - población infantil',
    };
  },
};