import { ItemAnalysis } from './types';

/**
 * Punto de corte oficial del CDI (manual TEA, página 11).
 *
 * "El valor de corte más utilizado, tanto en población española como extranjera,
 * es 19 (Del Barrio, 1997)."
 *
 * Se usa como criterio auxiliar de cribado, no como diagnóstico.
 */
const CUTOFF_SCORE = 19;

/**
 * Analiza los ítems individuales del CDI para detectar:
 * - Activación del ítem 9 (ideación suicida).
 * - Ítems con valor máximo (2), que indican intensidad/frecuencia alta.
 * - Ítems con valor medio (1).
 * - Si el Total directo supera el punto de corte.
 *
 * Nota sobre el ítem 9:
 * El manual TEA destaca explícitamente (página 36, sección 4.7) que "es de crucial
 * importancia atender al ítem 9 que explora la intencionalidad suicida". Cualquier
 * activación (valor >= 1) se marca como alerta.
 *
 * @param correctedScores - array de 27 puntuaciones ya corregidas (0, 1 o 2)
 * @param totalScore - puntuación directa total
 * @returns objeto con flags de análisis
 */
export function analyzeItems(
  correctedScores: number[],
  totalScore: number,
): ItemAnalysis {
  if (correctedScores.length !== 27) {
    throw new Error(
      `Se esperaban 27 puntuaciones corregidas, se recibieron ${correctedScores.length}.`,
    );
  }

  // Valor del ítem 9 (0, 1 o 2)
  const item9Value = correctedScores[8]; // índice 8 = ítem 9
  const item9Alert = item9Value >= 1;

  // Ítems con valor 2 (intensidad/frecuencia máxima)
  const itemsValue2: number[] = [];
  // Ítems con valor 1 (intensidad/frecuencia media)
  const itemsValue1: number[] = [];

  for (let i = 0; i < 27; i++) {
    const itemNumber = i + 1;
    const score = correctedScores[i];
    if (score === 2) itemsValue2.push(itemNumber);
    else if (score === 1) itemsValue1.push(itemNumber);
  }

  // Punto de corte
  const cutoffExceeded = totalScore >= CUTOFF_SCORE;

  return {
    item9Value,
    item9Alert,
    itemsValue2,
    itemsValue1,
    cutoffExceeded,
  };
}