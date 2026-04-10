import { TestScoring, ScoringResult } from '../../models/test.interfaces';

export const STAIC_SCORING: TestScoring = {
  score(answers: number[]): ScoringResult {
    const estadoAnswers = answers.slice(0, 20);
    const rasgoAnswers = answers.slice(20, 40);

    const estadoScore = estadoAnswers.reduce((sum, val) => sum + val, 0);
    const rasgoScore = rasgoAnswers.reduce((sum, val) => sum + val, 0);
    const totalScore = estadoScore + rasgoScore;
    const maxScore = 120;

    return {
      totalScore,
      maxScore,
      percentage: Math.round((totalScore / maxScore) * 100),
      subscales: {
        'Ansiedad Estado': estadoScore,
        'Ansiedad Rasgo': rasgoScore,
      },
      details: {
        estadoScore,
        rasgoScore,
        estadoMax: 60,
        rasgoMax: 60,
        estadoPercentage: Math.round((estadoScore / 60) * 100),
        rasgoPercentage: Math.round((rasgoScore / 60) * 100),
      },
    };
  },
};