import { InterpretationConfig, ScoringResult, ClinicalRule, AIInput } from '../../models/test.interfaces';

const CLINICAL_RULES: ClinicalRule[] = [
  {
    condition: () => true,
    finding: 'Calificación pendiente de integración con TEA Corrige. Puntuación actual es suma directa sin baremos.',
    severity: 'LOW',
  },
];

export const CUIDA_INTERPRETATION: InterpretationConfig = {
  clinicalRules: CLINICAL_RULES,
  maxTokens: 400,
  systemPrompt: `Eres un psicólogo clínico forense. Genera una nota breve sobre los resultados del CUIDA para un informe pericial judicial. Máximo 150 palabras. Escribe en español.

REGLAS:
- Indica que los resultados son preliminares (suma directa, sin baremos TEA).
- Menciona la puntuación total obtenida.
- NO hagas interpretaciones clínicas sin baremos validados.
- Indica que se requiere calificación con TEA Corrige para interpretación válida.
- Escribe en párrafos narrativos.`,

  buildAIInput: (result: ScoringResult): AIInput => {
    return {
      testName: 'CUIDA - Cuestionario para la Evaluación de Adoptantes',
      testDescription: 'Evaluación de capacidades parentales (requiere calificación TEA Corrige)',
      scores: {
        'Puntuación directa total': result.totalScore,
        'Máximo posible': result.maxScore,
      },
      clinicalFindings: ['Calificación preliminar sin baremos TEA Corrige'],
      context: 'Evaluación pericial judicial - capacidades parentales',
    };
  },
};