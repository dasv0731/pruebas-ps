import { InterpretationConfig, ScoringResult, ClinicalRule, AIInput } from '../../models/test.interfaces';
import type { CdiScoringData } from '../../components/cdi-results/cdi-results.component';

// Solo se conserva el punto de corte de cribado que el manual TEA respalda
// (PD Total ≥ 19, Del Barrio 1997). Las antiguas bandas <10 / 10-18 y las reglas
// de "predominio" D vs A (ratio 1.5×) eran cortes INVENTADOS que el manual no
// recoge; se han suprimido. La clasificación clínica real se hace por PERCENTIL
// baremado (ver classification.ts en la Lambda cdi-score): ≤85 sin síntomas,
// 90-95 leve, 96-99 severa. Fuente: correccion/CDI-guia-de-correccion.md §5.
const CLINICAL_RULES: ClinicalRule[] = [
  {
    condition: (r) => r.totalScore >= 19,
    finding: 'Puntuación total directa ≥ 19/54: supera el punto de corte de cribado del manual (Del Barrio, 1997); posible caso a confirmar con baremo y evaluación multimodal',
    severity: 'HIGH',
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
- Considera que es población infantil (7-15 años).
- Concluye con la relevancia para el contexto pericial.
- Escribe en párrafos narrativos, sin encabezados ni viñetas.
- Si se aporta puntuación baremada (PC/T), priorízala sobre la directa.
- Comenta el ítem 9 (ideación suicida) SIEMPRE que item9Alert sea true.
- Si reportMode es parcial o no interpretable, declara la limitación metodológica.`,

  buildAIInput: (result: ScoringResult): AIInput => {
    const findings: string[] = [];
    for (const rule of CLINICAL_RULES) {
      if (rule.condition(result)) {
        findings.push(rule.finding);
      }
    }
    return {
      testName: 'CDI - Inventario de Depresión Infantil',
      testDescription: 'Evalúa síntomas depresivos en niños de 7 a 15 años',
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

/**
 * Serializa el scoring real del CDI (Lambda cdi-score, scoringVersion 2) para
 * la interpretación IA. El buildAIInput(ScoringResult) de arriba no aplica
 * porque el CDI transcrito no pasa por testLoader.score.
 */
export function buildCdiAIInputFromScoring(cdi: CdiScoringData): Record<string, any> {
  return {
    testName: 'CDI - Inventario de Depresión Infantil',
    reportMode: cdi.reportMode,
    rawScores: cdi.rawScores,
    normativeGroup: cdi.normativeGroup,
    normedScores: cdi.normedScores,
    totalClassification: cdi.totalClassification,
    item9Alert: cdi.itemAnalysis?.item9Alert,
    item9Value: cdi.itemAnalysis?.item9Value,
    cutoffExceeded: cdi.itemAnalysis?.cutoffExceeded,
    warnings: cdi.warnings || [],
    context: 'Evaluación pericial judicial - población infantil',
  };
}