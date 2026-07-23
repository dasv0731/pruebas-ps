import { TestScoring, ScoringResult } from '../../models/test.interfaces';

/**
 * Corrección del STAI (Inventario de Ansiedad Estado-Rasgo), adaptación española TEA.
 *
 * La respuesta se recoge como opción 1-4 (1=Nada … 4=Mucho) pero se PUNTÚA 0-3,
 * igual que en la Lambda `amplify/functions/stai-score` (única fuente de verdad
 * de la corrección). Cada subescala suma 20 ítems corregidos → rango 0-60.
 *
 * Ítems invertidos: están redactados en sentido de BAJA ansiedad
 * (p. ej. "Me siento calmado"), por lo que su puntuación se invierte
 * (opción 1→3, 2→2, 3→1, 4→0). Los ítems directos puntúan opción-1 (1→0 … 4→3).
 *
 * Fuente de los ítems invertidos: manual del STAI (idéntica a la Lambda).
 */
const INVERTED_ESTADO = new Set([1, 2, 5, 8, 10, 11, 15, 16, 19, 20]);
const INVERTED_RASGO = new Set([21, 26, 27, 30, 33, 36, 39]);

const TOTAL_ITEMS = 40;
const SUBSCALE_MAX = 60; // 20 ítems × 3
const TOTAL_MAX = 120;

/**
 * Puntúa un ítem del STAI. Opción válida 1-4 → puntuación 0-3.
 * Una opción ausente o fuera de rango aporta 0 (no infla la ansiedad,
 * ni siquiera en ítems invertidos) y se contabiliza como no respondida.
 */
function scoreStaiItem(itemNumber: number, option: number): number {
  if (!Number.isInteger(option) || option < 1 || option > 4) {
    return 0;
  }
  const inverted = INVERTED_ESTADO.has(itemNumber) || INVERTED_RASGO.has(itemNumber);
  return inverted ? 4 - option : option - 1;
}

export const STAI_SCORING: TestScoring = {
  score(answers: number[]): ScoringResult {
    let estado = 0;
    let rasgo = 0;
    let answered = 0;

    for (let i = 0; i < TOTAL_ITEMS; i++) {
      const itemNumber = i + 1;
      const option = answers[i];
      if (Number.isInteger(option) && option >= 1 && option <= 4) {
        answered++;
      }
      const corrected = scoreStaiItem(itemNumber, option);
      if (itemNumber <= 20) {
        estado += corrected;
      } else {
        rasgo += corrected;
      }
    }

    const totalScore = estado + rasgo;
    const missing = TOTAL_ITEMS - answered;

    return {
      totalScore,
      maxScore: TOTAL_MAX,
      percentage: Math.round((totalScore / TOTAL_MAX) * 100),
      subscales: {
        'Ansiedad Estado': estado,
        'Ansiedad Rasgo': rasgo,
      },
      details: {
        estadoScore: estado,
        rasgoScore: rasgo,
        estadoMax: SUBSCALE_MAX,
        rasgoMax: SUBSCALE_MAX,
        estadoPercentage: Math.round((estado / SUBSCALE_MAX) * 100),
        rasgoPercentage: Math.round((rasgo / SUBSCALE_MAX) * 100),
        answered,
        missing,
        incomplete: missing > 0,
      },
    };
  },
};
