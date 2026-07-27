export interface InterviewPromptOption {
  id: string;
  title: string;
  summary: string;
}

export const INTERVIEW_PROMPT_OPTIONS: readonly InterviewPromptOption[] = [
  {
    id: 'COMPREHENSIVE',
    title: 'Análisis integral de entrevista',
    summary: 'Extrae temas, relato, emociones, apoyos, riesgos y relaciones con padres, hermanos y otros familiares.',
  },
  {
    id: 'FAMILY_NETWORK',
    title: 'Vínculos familiares y red de apoyo',
    summary: 'Profundiza en convivencia, roles, conflictos, apego, contacto y apoyos familiares referidos.',
  },
  {
    id: 'NARRATIVE_COHERENCE',
    title: 'Coherencia y evolución del relato',
    summary: 'Ordena cronología, versiones, cambios, vacíos y elementos que requieren contraste, sin valorar credibilidad.',
  },
  {
    id: 'EMOTIONAL_FUNCTIONING',
    title: 'Vivencia emocional y afrontamiento',
    summary: 'Recoge emociones, regulación, afrontamiento, impacto subjetivo y recursos expresados en la entrevista.',
  },
  {
    id: 'RISK_PROTECTION',
    title: 'Factores de riesgo y protección',
    summary: 'Identifica factores referidos de vulnerabilidad y protección, y los asuntos que requieren exploración profesional.',
  },
] as const;

export const DEFAULT_INTERVIEW_PROMPT_ID = 'COMPREHENSIVE';
