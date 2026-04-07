import { TestScoring, ScoringResult } from '../../models/test.interfaces';

export const STAI_SCORING: TestScoring = {
  score(answers: number[]): ScoringResult {
    const estadoAnswers = answers.slice(0, 20);
    const rasgoAnswers = answers.slice(20, 40);

    const estadoScore = estadoAnswers.reduce((sum, val) => sum + val, 0);
    const rasgoScore = rasgoAnswers.reduce((sum, val) => sum + val, 0);
    const totalScore = estadoScore + rasgoScore;
    const maxScore = 160;

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
        estadoMax: 80,
        rasgoMax: 80,
        estadoPercentage: Math.round((estadoScore / 80) * 100),
        rasgoPercentage: Math.round((rasgoScore / 80) * 100),
      },
    };
  },
};