export type Sex = 'MALE' | 'FEMALE';
export type AgeGroup = 'ADOLESCENTE' | 'ADULTO';

export type ReportMode =
  | 'COMPLETE'
  | 'PARTIAL_NO_NORM'
  | 'PARTIAL_INSUFFICIENT'
  | 'NOT_INTERPRETABLE';

export interface RawScores {
  /** Ansiedad Estado: suma de los 20 ítems corregidos (1-20). Rango 0-60. */
  estado: number;
  /** Ansiedad Rasgo: suma de los 20 ítems corregidos (21-40). Rango 0-60. */
  rasgo: number;
}

export interface NormedScore {
  /** Percentil (1-99). */
  pc: number;
  /** Decatipo (1-10), escala estándar del STAI TEA. */
  decatipo: number;
}

export interface NormedScores {
  estado: NormedScore;
  rasgo: NormedScore;
}

export interface NormativeGroup {
  sex: Sex;
  ageYears: number;
  ageGroup: AgeGroup | null;
  /** Identificador de la columna del baremo (ej: "AdolescentesVarones"). */
  tableColumn: string;
}

export interface StaiScoringResult {
  success: boolean;
  scoringVersion: number;
  reportMode: ReportMode;
  rawScores: RawScores;
  normativeGroup: NormativeGroup | null;
  normedScores: NormedScores | null;
  generatedAt: string;
  warnings: string[];
  error?: string;
}