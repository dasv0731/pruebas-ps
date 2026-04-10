import { TestDefinition } from '../models/test.interfaces';
import { STAI_CONFIG } from './stai/stai.config';
import { STAI_SCORING } from './stai/stai.scoring';
import { STAI_INTERPRETATION } from './stai/stai.interpretation';
import { STAIC_CONFIG } from './staic/staic.config';
import { STAIC_SCORING } from './staic/staic.scoring';
import { STAIC_INTERPRETATION } from './staic/staic.interpretation';
import { CDI_CONFIG } from './cdi/cdi.config';
import { CDI_SCORING } from './cdi/cdi.scoring';
import { CDI_INTERPRETATION } from './cdi/cdi.interpretation';
import { CUIDA_CONFIG } from './cuida/cuida.config';
import { CUIDA_SCORING } from './cuida/cuida.scoring';
import { CUIDA_INTERPRETATION } from './cuida/cuida.interpretation';
import { TAMAI_CONFIG } from './tamai/tamai.config';
import { TAMAI_SCORING } from './tamai/tamai.scoring';
import { TAMAI_INTERPRETATION } from './tamai/tamai.interpretation';

const TEST_REGISTRY: Record<string, TestDefinition> = {
  STAI: { config: STAI_CONFIG, scoring: STAI_SCORING, interpretation: STAI_INTERPRETATION },
  STAIC: { config: STAIC_CONFIG, scoring: STAIC_SCORING, interpretation: STAIC_INTERPRETATION },
  CDI: { config: CDI_CONFIG, scoring: CDI_SCORING, interpretation: CDI_INTERPRETATION },
  CUIDA: { config: CUIDA_CONFIG, scoring: CUIDA_SCORING, interpretation: CUIDA_INTERPRETATION },
  TAMAI: { config: TAMAI_CONFIG, scoring: TAMAI_SCORING, interpretation: TAMAI_INTERPRETATION },
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

export function getTestInterpretation(shortName: string) {
  return TEST_REGISTRY[shortName]?.interpretation || null;
}

export function getAllTestConfigs() {
  return Object.values(TEST_REGISTRY).map((t) => t.config);
}