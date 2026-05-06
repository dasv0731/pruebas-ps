export type EnCategory = 'BAJO' | 'NORMAL' | 'ALTO';
export type QualLevel = 'MUY_BAJO' | 'BAJO' | 'MEDIO' | 'ALTO' | 'MUY_ALTO';
export type ParentingStyle = 'INDUCTIVO' | 'RIGIDO' | 'PERMISIVO' | 'SOBREPROTECTOR' | 'MIXTO';
export type ReportMode = 'COMPLETE' | 'NOT_INTERPRETABLE';

export interface CuidaEscalas {
  altruismo: number; apertura: number; asertividad: number;
  autoestima: number; resolverProblemas: number; empatia: number;
  equilibrioEmocional: number; independencia: number; flexibilidad: number;
  reflexividad: number; sociabilidad: number; toleranciaFrustracion: number;
  vinculosAfectivos: number; resolucionDuelo: number;
}

export interface CuidaCuidado {
  cuidadoResponsable: number;
  cuidadoAfectivo: number;
  sensibilidad: number;
  agresividad: number;
}

export interface CuidaManualScoring {
  source: 'TEA_MANUAL';
  escalas: CuidaEscalas;
  cuidado: CuidaCuidado;
  deseabilidadSocial: number;
  indices: {
    invalidez: { pd: number; en: EnCategory };
    inconsistencia: { pd: number; en: EnCategory };
  };
  itemsCriticosTea: Array<{ itemNumber: number; response: number }>;
  baremo: string;
  enteredAt: string;
  warnings: string[];
}

export interface QualitativeLevel {
  en: number;
  level: QualLevel;
}

export interface JointReadingFlag {
  pattern: string;
  description: string;
  scalesInvolved: string[];
}

export interface CriticalItemFlag {
  itemNumber: number;
  escala: string;
  content: string;
  reason: string;
  rawResponse: number | null;
}

export interface DeseabilidadInterpretation {
  en: number;
  level: QualLevel;
  contaminationRisk: boolean;
  scalesToInterpretWithCaution: string[];
}

export interface ParentingStyleResult {
  predominantStyle: ParentingStyle;
  confidence: 'ALTA' | 'MEDIA' | 'BAJA';
  supportingScales: string[];
  recommendation: string;
}

export interface ProfileValidity {
  isValid: boolean;
  reason: string | null;
}

export interface CuidaFindings {
  manualScoring: CuidaManualScoring;
  interpretationVersion: 1;
  profileValidity: ProfileValidity;
  reportMode: ReportMode;
  qualitativeLevels: Record<string, QualitativeLevel>;
  deseabilidadInterpretation: DeseabilidadInterpretation;
  jointReadingFlags: JointReadingFlag[];
  criticalItemsToClarify: CriticalItemFlag[];
  parentingStyleInference: ParentingStyleResult;
  generatedAt: string;
  warnings: string[];
}
