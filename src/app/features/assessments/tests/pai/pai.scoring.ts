import { TestScoring, ScoringResult } from '../../models/test.interfaces';

// El PAI se corrige mediante TEACorrige. Este scoring es un marcador vacío.
export const PAI_SCORING: TestScoring = {
  score(_answers: number[]): ScoringResult {
    return {
      totalScore: 0,
      maxScore: 0,
      percentage: 0,
      subscales: {},
      details: { source: 'TEA_PENDING' },
    };
  },
};
