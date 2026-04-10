import { InterpretationConfig, ScoringResult, ClinicalRule, AIInput } from '../../models/test.interfaces';

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