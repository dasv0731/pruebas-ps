import { InterpretationConfig, ScoringResult, ClinicalRule, AIInput } from '../../models/test.interfaces';
import type { ScaleRow } from '../../components/tamai-results/tamai-results.component';

const CLINICAL_RULES: ClinicalRule[] = [
  {
    condition: (r) => (r.subscales?.['Adaptación Personal'] || 0) > 11,
    finding: 'Inadaptación personal ALTA (>50% de ítems): posibles dificultades emocionales significativas',
    severity: 'HIGH',
  },
  {
    condition: (r) => (r.subscales?.['Adaptación Personal'] || 0) <= 5,
    finding: 'Adaptación personal ADECUADA (≤25% de ítems)',
    severity: 'LOW',
  },
  {
    condition: (r) => (r.subscales?.['Adaptación Escolar'] || 0) > 10,
    finding: 'Inadaptación escolar ALTA (>50% de ítems): dificultades significativas en el ámbito académico',
    severity: 'HIGH',
  },
  {
    condition: (r) => (r.subscales?.['Adaptación Social'] || 0) > 9,
    finding: 'Inadaptación social ALTA (>50% de ítems): dificultades significativas en relaciones interpersonales',
    severity: 'HIGH',
  },
  {
    condition: (r) => (r.subscales?.['Adaptación Familiar'] || 0) > 3,
    finding: 'Inadaptación familiar ALTA (>60% de ítems): percepción negativa del entorno familiar',
    severity: 'HIGH',
  },
  {
    condition: (r) => (r.subscales?.['Relación con Hermanos'] || 0) > 3,
    finding: 'Conflicto con hermanos ALTO (>60% de ítems)',
    severity: 'MODERATE',
  },
  {
    condition: (r) => (r.subscales?.['Satisfacción Personal'] || 0) < 8,
    finding: 'Satisfacción personal BAJA (<50% de ítems positivos): posible autoconcepto negativo',
    severity: 'MODERATE',
  },
  {
    condition: (r) => (r.subscales?.['Satisfacción Personal'] || 0) >= 13,
    finding: 'Satisfacción personal ALTA (≥75% de ítems positivos): autoconcepto positivo',
    severity: 'LOW',
  },
];

export const TAMAI_INTERPRETATION: InterpretationConfig = {
  clinicalRules: CLINICAL_RULES,
  maxTokens: 600,
  systemPrompt: `Eres un psicólogo clínico forense especializado en población infantil. Genera una interpretación clínica CONCISA del TAMAI para un informe pericial judicial. Máximo 300 palabras. Escribe en español.

REGLAS:
- Usa solo los datos proporcionados.
- Interpreta cada área de adaptación (personal, escolar, social, familiar).
- Incluye la percepción hacia padre y madre si hay datos relevantes.
- Relaciona los hallazgos entre sí (ej: inadaptación escolar con social).
- Las puntuaciones son percentiles (PC) baremados por TEA. Factores generales (G, P, E, S, Pa, M) en sistema Hepta: Muy bajo 1-5, Bajo 6-20, Casi bajo 21-40, Medio 41-60, Casi alto 61-80, Alto 81-95, Muy alto 96-99. Subfactores y escalas no generales (F, H, Dis, PI, Contr.) en Indicación Crítica: Sin constatar 1-65, Constatada 66-80, Bien constatada 81-95, Muy constatada 96-99.
- DIRECCIÓN: en P, E, S, F, H, Dis mayor PC = mayor inadaptación/problema. En Educación del padre (Pa) y madre (M) mayor PC = estilo educador MÁS adecuado (favorable); un PC bajo en Pa/M es lo desfavorable.
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
      testName: 'TAMAI - Test Autoevaluativo Multifactorial de Adaptación Infantil',
      testDescription: 'Evalúa adaptación personal, escolar, social y familiar en niños y adolescentes',
      scores: result.subscales || {},
      clinicalFindings: findings,
      context: 'Evaluación pericial judicial - población infantil',
    };
  },
};

/**
 * Serializa las filas PD/PC del TAMAI transcrito (jerárquico, con baremo TEA)
 * para la interpretación IA. El buildAIInput(ScoringResult) de arriba no
 * aplica al TAMAI transcrito: no pasa por testLoader.score ni tiene baremo.
 */
export function buildTamaiAIInputFromRows(
  rows: ScaleRow[],
  meta: { level: string | number; baremo: string; edad?: number; sexo?: string }
): Record<string, any> {
  return {
    testName: 'TAMAI - Test Autoevaluativo Multifactorial de Adaptación Infantil',
    meta,
    escalas: rows.map((r) => ({
      code: r.code,
      label: r.label,
      pd: r.pd,
      pc: r.pc,
      categoria: r.category,
    })),
    // Escalas destacadas = las que el badge marca como clínicamente atendibles
    // (badge-high / badge-critical). Es direccional: para Pa/M destaca la
    // educación POCO adecuada (PC bajo), para inadaptación el PC alto.
    escalasDestacadas: rows
      .filter((r) => r.badgeClass === 'badge-high' || r.badgeClass === 'badge-critical')
      .map((r) => ({ code: r.code, label: r.label, pc: r.pc, categoria: r.category })),
    context: 'Evaluación pericial judicial - población infantil',
  };
}