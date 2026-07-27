import { InterpretationConfig, ScoringResult, AIInput } from '../../models/test.interfaces';
import type { CuidaFindings } from '../../components/cuida-results/cuida-results.component';

/**
 * Interpretación IA del CUIDA. La Lambda cuida-interpret ya calcula y
 * persiste CuidaFindings completos (niveles cualitativos, deseabilidad,
 * patrones de lectura conjunta, ítems críticos y warnings) dentro de
 * AssessmentScoring.scores. Esta narrativa se genera en
 * el front a partir de esos findings ya persistidos; no se toca la Lambda.
 *
 * `CUIDA_INTERPRETATION` conserva la forma `InterpretationConfig` (requerida
 * por `test-registry.ts` / `TestDefinition`) por compatibilidad, pero CUIDA
 * nunca pasa por `testLoader.score` (se corrige en TEACorrige) por lo que
 * `buildAIInput` de aquí no se usa en la práctica: `cuida-results.component`
 * usa `buildCuidaAIInputFromFindings` más abajo, que sí serializa los
 * findings reales. `systemPrompt`/`maxTokens` sí son los vigentes.
 */
export const CUIDA_INTERPRETATION: InterpretationConfig = {
  clinicalRules: [],
  maxTokens: 600,
  systemPrompt: `Eres un psicólogo clínico forense especializado en evaluación de capacidades parentales. Genera una interpretación clínica del perfil CUIDA para un informe pericial judicial. Máximo 300 palabras. Escribe en español, en párrafos narrativos.

REGLAS:
- Usa solo los datos proporcionados. No inventes contenido.
- Si reportMode es 'NOT_INTERPRETABLE', LIMÍTATE a documentar la invalidez del protocolo y no interpretes escalas clínicas.
- Cita las escalas con nivel MUY_BAJO, BAJO, ALTO o MUY_ALTO (las de nivel MEDIO no requieren comentario individual).
- Comenta la deseabilidad social y su riesgo de contaminación sobre otras escalas si corresponde.
- Incorpora los patrones de lectura conjunta (jointReadingFlags) si los hay.
- El CUIDA no evalúa "estilos educativos" con una escala propia: NO afirmes un estilo de crianza como resultado del test; a lo sumo describe tendencias cualitativas a partir de las escalas y remítelas a la entrevista.
- Señala los ítems críticos a clarificar en entrevista si los hay.
- Concluye con la relevancia para el contexto pericial (evaluación de capacidades parentales).`,

  buildAIInput: (result: ScoringResult): AIInput => ({
    testName: 'CUIDA - Cuestionario para la Evaluación de Adoptantes',
    testDescription: 'Evaluación de capacidades parentales',
    scores: { 'Puntuación directa total': result.totalScore, 'Máximo posible': result.maxScore },
    clinicalFindings: [],
    context: 'Evaluación pericial judicial - capacidades parentales',
  }),
};

const ESCALAS_PERSONALIDAD_LABELS: Record<string, string> = {
  altruismo: 'Altruismo',
  apertura: 'Apertura',
  asertividad: 'Asertividad',
  autoestima: 'Autoestima',
  resolverProblemas: 'Resolver problemas',
  empatia: 'Empatía',
  equilibrioEmocional: 'Equilibrio emocional',
  independencia: 'Independencia',
  flexibilidad: 'Flexibilidad',
  reflexividad: 'Reflexividad',
  sociabilidad: 'Sociabilidad',
  toleranciaFrustracion: 'Tolerancia a la frustración',
  vinculosAfectivos: 'Vínculos afectivos',
  resolucionDuelo: 'Resolución del duelo',
};

const ESCALAS_CUIDADO_LABELS: Record<string, string> = {
  cuidadoResponsable: 'Cuidado responsable',
  cuidadoAfectivo: 'Cuidado afectivo',
  sensibilidad: 'Sensibilidad',
  agresividad: 'Agresividad',
};

const ALL_ESCALAS_LABELS: Record<string, string> = {
  ...ESCALAS_PERSONALIDAD_LABELS,
  ...ESCALAS_CUIDADO_LABELS,
};

/**
 * Serializa los CuidaFindings (ya persistidos por la Lambda) para la
 * interpretación IA, incluyendo solo las escalas con nivel distinto de
 * MEDIO para mantener el payload compacto.
 */
export function buildCuidaAIInputFromFindings(
  findings: CuidaFindings,
  meta: { edad?: number; sexo?: string } = {}
): Record<string, any> {
  const escalas = Object.entries(findings.qualitativeLevels || {})
    .map(([key, v]) => ({
      key,
      label: ALL_ESCALAS_LABELS[key] ?? key,
      en: v.en,
      level: v.level,
    }));

  return {
    testName: 'CUIDA - Cuestionario para la Evaluación de Adoptantes',
    meta,
    reportMode: findings.reportMode,
    profileValidity: findings.profileValidity,
    escalas,
    indicesControl: findings.manualScoring?.indices,
    deseabilidadInterpretation: findings.deseabilidadInterpretation,
    jointReadingFlags: findings.jointReadingFlags,
    criticalItemsToClarify: (findings.criticalItemsToClarify || []).map((c) => ({
      itemNumber: c.itemNumber,
      escala: c.escala,
      reason: c.reason,
    })),
    warnings: findings.warnings || [],
    context: 'Evaluación pericial judicial - capacidades parentales',
  };
}
