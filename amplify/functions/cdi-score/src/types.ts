export type Sex = 'MALE' | 'FEMALE';
export type AgeGroup = '7-8' | '9-10' | '11-15';
export type TableColumn = 'V7-8' | 'V9-10' | 'V11-15' | 'M7-8' | 'M9-10' | 'M11-15';

export type ReportMode =
  | 'COMPLETE'
  | 'PARTIAL_NO_NORM'
  | 'PARTIAL_INSUFFICIENT'
  | 'NOT_INTERPRETABLE';

export type TotalClassification = 'SIN_SINTOMATOLOGIA' | 'LEVE' | 'SEVERA';

export interface RawScores {
  total: number;
  disforia: number;
  autoestima: number;
}

export interface NormedScore {
  pc: number;
  t: number;
}

export interface NormedScores {
  total: NormedScore;
  disforia: NormedScore;
  autoestima: NormedScore;
}

export interface NormativeGroup {
  sex: Sex;
  ageYears: number;
  ageGroup: AgeGroup | null;
  tableColumn: string;
}

export interface ItemAnalysis {
  item9Value: number;
  item9Alert: boolean;
  itemsValue2: number[];
  itemsValue1: number[];
  cutoffExceeded: boolean;
}

export interface CdiScoringResult {
  success: boolean;
  scoringVersion: number;
  reportMode: ReportMode;
  rawScores: RawScores;
  normativeGroup: NormativeGroup | null;
  normedScores: NormedScores | null;
  totalClassification: TotalClassification | null;
  itemAnalysis: ItemAnalysis;
  generatedAt: string;
  warnings: string[];
  error?: string;
}

export interface BaremCell {
  /** Valor mínimo de puntuación directa incluido en el rango (inclusive). null si celda vacía "--" */
  min: number | null;
  /** Valor máximo (inclusive). Si la celda es un valor único, min === max */
  max: number | null;
}

export interface BaremRow {
  pc: number;
  z: number;
  t: number;
  cells: Record<TableColumn, BaremCell>;
}

export interface BaremTable {
  name: 'TOTAL' | 'DISFORIA' | 'AUTOESTIMA';
  maxPossible: number;
  rows: BaremRow[];
}