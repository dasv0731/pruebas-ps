import { TestScoring, ScoringResult } from '../../models/test.interfaces';

export const CUIDA_SCORING: TestScoring = {
  score(answers: number[]): ScoringResult {
    const totalScore = answers.reduce((sum, val) => sum + val, 0);
    const maxScore = 189 * 4;

    return {
      totalScore,
      maxScore,
      percentage: Math.round((totalScore / maxScore) * 100),
      details: {
        note: 'Calificación pendiente de integración con TEA Corrige. Puntuación actual es suma directa.',
        totalQuestions: 189,
        answeredQuestions: answers.filter((a) => a > 0).length,
      },
    };
  },
};