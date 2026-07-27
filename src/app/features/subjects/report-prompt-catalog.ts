export interface ReportPromptOption { id: string; title: string; summary: string; }

export const ASSESSMENT_REPORT_PROMPTS: readonly ReportPromptOption[] = [
  { id: 'ASSESSMENT_INTEGRAL', title: 'Integración clínica de pruebas', summary: 'Resume hallazgos, convergencias, divergencias y límites entre todas las pruebas disponibles.' },
  { id: 'ASSESSMENT_VALIDITY', title: 'Validez y cautelas', summary: 'Prioriza baremos, validez, alertas, límites metodológicos y datos que requieren revisión.' },
  { id: 'ASSESSMENT_FUNCTIONING', title: 'Funcionamiento psicológico referido', summary: 'Organiza los resultados por áreas de funcionamiento, sin convertirlos en diagnósticos.' },
] as const;

export const INTERVIEW_REPORT_PROMPTS: readonly ReportPromptOption[] = [
  { id: 'INTERVIEW_INTEGRAL', title: 'Síntesis integral de entrevistas', summary: 'Integra temas, relaciones familiares, emociones, apoyos, riesgos y evolución entre entrevistas.' },
  { id: 'INTERVIEW_FAMILY', title: 'Relaciones familiares y red de apoyo', summary: 'Prioriza padres, hermanos, familia extensa, convivencia, conflictos, apoyos y cambios relatados.' },
  { id: 'INTERVIEW_TIMELINE', title: 'Evolución y aspectos a contrastar', summary: 'Ordena cambios entre entrevistas, coincidencias, divergencias y vacíos que requieren contraste.' },
] as const;
