export type CaseStatus = 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export type SubjectType = 'MADRE' | 'PADRE' | 'HIJO' | 'HIJA' | 'TUTOR' | 'OTRO';

export type SubjectStatus =
  | 'PENDING'
  | 'IN_EVALUATION'
  | 'EVALUATED'
  | 'REPORT_DRAFT'
  | 'REPORT_APPROVED';

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  ACTIVE: 'Activo',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  ARCHIVED: 'Archivado',
};

export const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  MADRE: 'Madre',
  PADRE: 'Padre',
  HIJO: 'Hijo',
  HIJA: 'Hija',
  TUTOR: 'Tutor',
  OTRO: 'Otro',
};

export const SUBJECT_STATUS_LABELS: Record<SubjectStatus, string> = {
  PENDING: 'Pendiente',
  IN_EVALUATION: 'En evaluación',
  EVALUATED: 'Evaluado',
  REPORT_DRAFT: 'Informe borrador',
  REPORT_APPROVED: 'Informe aprobado',
};

export type Sex = 'MALE' | 'FEMALE';

export const SEX_LABELS: Record<Sex, string> = {
  MALE: 'Masculino',
  FEMALE: 'Femenino',
};