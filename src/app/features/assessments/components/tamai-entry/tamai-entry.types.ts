import type { TamaiLevel } from './tamai-level-config';

export interface TamaiScore {
  pd: number;
  pc: number;
}

export interface TAMAIManualScoring {
  source: 'TEA_MANUAL_TAMAI';
  level: TamaiLevel;
  baremo: string;
  enteredAt: string;
  escalas: Record<string, TamaiScore>;
}
