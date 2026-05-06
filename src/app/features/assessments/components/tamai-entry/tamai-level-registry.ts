import type { TamaiLevel, TamaiLevelConfig } from './tamai-level-config';
import { TAMAI_LEVEL1_CONFIG } from './tamai-level1.config';

export const TAMAI_LEVEL_REGISTRY: Record<TamaiLevel, TamaiLevelConfig | null> = {
  'I': TAMAI_LEVEL1_CONFIG,
  'II': null,
  'III': null,
};

export const SUPPORTED_LEVELS: TamaiLevel[] = (['I', 'II', 'III'] as TamaiLevel[])
  .filter((l) => TAMAI_LEVEL_REGISTRY[l] !== null);
