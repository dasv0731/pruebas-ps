import { TestScoring, ScoringResult } from '../../models/test.interfaces';

// Valores de scoring por pregunta: [opción A, opción B, opción C]
// null = pendiente de definir por el usuario
const SCORING_MAP: (number[] | null)[] = [
  [0, 1, 2],  // 1
  [2, 1, 0],  // 2
  [0, 1, 2],  // 3
  null,        // 4
  null,        // 5
  null,        // 6
  null,        // 7
  null,        // 8
  null,        // 9
  null,        // 10
  null,        // 11
  null,        // 12
  null,        // 13
  null,        // 14
  null,        // 15
  null,        // 16
  null,        // 17
  null,        // 18
  null,        // 19
  null,        // 20
  null,        // 21
  null,        // 22
  null,        // 23
  null,        // 24
  null,        // 25
  null,        // 26
  null,        // 27
];

const DISFORIA_ITEMS = [1, 2, 3, 4, 6, 10, 11, 12, 16, 17, 18, 19, 20, 21, 22, 26, 27];
const AUTOESTIMA_ITEMS = [5, 7, 8, 9, 13, 14, 15, 23, 24, 25];
const CUTOFF_SCORE = 19;

export const CDI_SCORING: TestScoring = {
  score(answers: number[]): ScoringResult {
    let totalScore = 0;
    const itemScores: number[] = [];

    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i]; // 1, 2 o 3 (opción seleccionada)
      const map = SCORING_MAP[i];

      let itemScore: number;
      if (map) {
        itemScore = map[answer - 1] ?? 0;
      } else {
        // Si no hay mapa definido, usar valor directo (answer - 1)
        itemScore = answer - 1;
      }

      itemScores.push(itemScore);
      totalScore += itemScore;
    }

    const maxScore = 54;

    // Subescalas
    const disforiaScore = DISFORIA_ITEMS.reduce(
      (sum, item) => sum + (itemScores[item - 1] || 0), 0
    );
    const autoestimaScore = AUTOESTIMA_ITEMS.reduce(
      (sum, item) => sum + (itemScores[item - 1] || 0), 0
    );

    // Percentil aproximado
    let percentileCategory = '';
    const percentile = Math.round((totalScore / maxScore) * 100);
    if (percentile < 25) {
      percentileCategory = 'Sin síntomas depresivos significativos';
    } else if (percentile < 75) {
      percentileCategory = 'Presencia de síntomas leves a moderados';
    } else if (percentile < 90) {
      percentileCategory = 'Presencia de síntomas marcados o severos';
    } else {
      percentileCategory = 'Presencia de síntomas en grado máximo';
    }

    return {
      totalScore,
      maxScore,
      percentage: Math.round((totalScore / maxScore) * 100),
      subscales: {
        'Disforia (D)': disforiaScore,
        'Autoestima Negativa (A)': autoestimaScore,
      },
      cutoff: {
        score: CUTOFF_SCORE,
        exceeded: totalScore >= CUTOFF_SCORE,
        description: totalScore >= CUTOFF_SCORE
          ? 'Puntuación indica posible trastorno depresivo'
          : 'Puntuación por debajo del punto de corte clínico',
      },
      percentileCategory,
      details: {
        itemScores,
        disforiaScore,
        autoestimaScore,
        disforiaMax: DISFORIA_ITEMS.length * 2,
        autoestimaMax: AUTOESTIMA_ITEMS.length * 2,
        scoringMapComplete: SCORING_MAP.every((m) => m !== null),
      },
    };
  },
};