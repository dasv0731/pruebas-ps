import { TestDefinition } from '../models/test.interfaces';
import { STAI_CONFIG } from './stai/stai.config';
import { STAI_SCORING } from './stai/stai.scoring';
import { CDI_CONFIG } from './cdi/cdi.config';
import { CDI_SCORING } from './cdi/cdi.scoring';
import { CUIDA_CONFIG } from './cuida/cuida.config';
import { CUIDA_SCORING } from './cuida/cuida.scoring';
import { TAMAI_CONFIG } from './tamai/tamai.config';
import { TAMAI_SCORING } from './tamai/tamai.scoring';

const TEST_REGISTRY: Record<string, TestDefinition> = {
  STAI: { config: STAI_CONFIG, scoring: STAI_SCORING }, 
  CDI: { config: CDI_CONFIG, scoring: CDI_SCORING },
  CUIDA: { config: CUIDA_CONFIG, scoring: CUIDA_SCORING },
  TAMAI: { config: TAMAI_CONFIG, scoring: TAMAI_SCORING },
};

export function getTestDefinition(shortName: string): TestDefinition | null {
  return TEST_REGISTRY[shortName] || null;
}

export function getAllTests(): TestDefinition[] {
  return Object.values(TEST_REGISTRY);
}

export function getTestConfig(shortName: string) {
  return TEST_REGISTRY[shortName]?.config || null;
}

export function getTestScoring(shortName: string) {
  return TEST_REGISTRY[shortName]?.scoring || null;
}

export function getAllTestConfigs() {
  return Object.values(TEST_REGISTRY).map((t) => t.config);
}