import { RawScores } from './types';

/**
 * Ítems invertidos de la escala Ansiedad-Estado (A/E).
 * Son los ítems dentro del rango 1-20 cuya puntuación se invierte:
 * opción 1 → 3, opción 2 → 2, opción 3 → 1, opción 4 → 0.
 *
 * Fuente: manual del STAI, adaptación española.
 */
const INVERTED_AE = new Set([1, 2, 5, 8, 10, 11, 15, 16, 19, 20]);

/**
 * Ítems invertidos de la escala Ansiedad-Rasgo (A/R).
 * Son los ítems dentro del rango 21-40 cuya puntuación se invierte:
 * opción 1 → 3, opción 2 → 2, opción 3 → 1, opción 4 → 0.
 *
 * Fuente: manual del STAI, adaptación española.
 */
const INVERTED_AR = new Set([21, 26, 27, 30, 33, 36, 39]);

/**
 * Número total de ítems del STAI.
 */
const TOTAL_ITEMS = 40;

/**
 * Corrige una respuesta individual al STAI.
 *
 * Reglas:
 * - Ítem directo: opción 1/2/3/4 → puntuación 0/1/2/3.
 * - Ítem invertido: opción 1/2/3/4 → puntuación 3/2/1/0.
 *
 * Nota sobre la equivalencia con el manual TEA:
 * El manual expresa el cálculo de las escalas como:
 *   A/E = 30 + (suma directos A/E) - (suma invertidos A/E)
 *   A/R = 21 + (suma directos A/R) - (suma invertidos A/R)
 * La implementación usada aquí (corregir cada ítem y luego sumar)
 * produce idénticos resultados numéricos, pero es más simple de
 * mantener y consistente con el patrón usado en otros tests (CDI).
 *
 * @param itemNumber - número de ítem (1-40)
 * @param selectedOption - opción elegida (1-4)
 * @returns puntuación corregida (0-3)
 */
export function scoreItem(itemNumber: number, selectedOption: number): number {
  if (selectedOption < 1 || selectedOption > 4) {
    throw new Error(
      `Opción inválida para ítem ${itemNumber}: ${selectedOption}. Debe ser 1, 2, 3 o 4.`,
    );
  }

  const isInverted =
    INVERTED_AE.has(itemNumber) || INVERTED_AR.has(itemNumber);

  if (isInverted) {
    // 1→3, 2→2, 3→1, 4→0
    return 4 - selectedOption;
  }

  // Directo: 1→0, 2→1, 3→2, 4→3
  return selectedOption - 1;
}

/**
 * Corrige las 40 respuestas y devuelve un array de 40 puntuaciones (0-3).
 *
 * @param answers - array de 40 respuestas, cada una con opción 1-4
 * @returns array de 40 puntuaciones corregidas
 */
export function correctAnswers(answers: number[]): number[] {
  if (answers.length !== TOTAL_ITEMS) {
    throw new Error(
      `Se esperaban ${TOTAL_ITEMS} respuestas, se recibieron ${answers.length}.`,
    );
  }

  const corrected: number[] = [];
  for (let i = 0; i < TOTAL_ITEMS; i++) {
    const itemNumber = i + 1;
    corrected.push(scoreItem(itemNumber, answers[i]));
  }
  return corrected;
}

/**
 * Calcula las puntuaciones directas de Ansiedad-Estado y Ansiedad-Rasgo.
 *
 * A/E = suma de los 20 ítems corregidos (1-20). Rango 0-60.
 * A/R = suma de los 20 ítems corregidos (21-40). Rango 0-60.
 *
 * @param correctedScores - array de 40 puntuaciones ya corregidas (0-3)
 * @returns { estado, rasgo }
 */
export function calculateRawScores(correctedScores: number[]): RawScores {
  if (correctedScores.length !== TOTAL_ITEMS) {
    throw new Error(
      `Se esperaban ${TOTAL_ITEMS} puntuaciones, se recibieron ${correctedScores.length}.`,
    );
  }

  // Ítems 1-20 (índices 0-19): Ansiedad-Estado
  const estado = correctedScores
    .slice(0, 20)
    .reduce((sum, v) => sum + v, 0);

  // Ítems 21-40 (índices 20-39): Ansiedad-Rasgo
  const rasgo = correctedScores
    .slice(20, 40)
    .reduce((sum, v) => sum + v, 0);

  // Validación aritmética: cada escala debe estar en rango 0-60
  if (estado < 0 || estado > 60) {
    throw new Error(`A/E fuera de rango 0-60: ${estado}`);
  }
  if (rasgo < 0 || rasgo > 60) {
    throw new Error(`A/R fuera de rango 0-60: ${rasgo}`);
  }

  return { estado, rasgo };
}

/**
 * Validación mínima del array de respuestas antes de procesar.
 *
 * @param answers - valor recibido del cliente
 * @returns null si es válido, mensaje de error si no lo es
 */
export function validateAnswers(answers: unknown): string | null {
  if (!Array.isArray(answers)) {
    return 'Las respuestas no son un array.';
  }
  if (answers.length !== TOTAL_ITEMS) {
    return `Se esperaban ${TOTAL_ITEMS} respuestas, se recibieron ${answers.length}.`;
  }
  for (let i = 0; i < TOTAL_ITEMS; i++) {
    const a = answers[i];
    if (typeof a !== 'number' || !Number.isInteger(a)) {
      return `Respuesta ${i + 1} no es un número entero: ${a}`;
    }
    if (a < 1 || a > 4) {
      return `Respuesta ${i + 1} fuera de rango: ${a}. Debe ser 1, 2, 3 o 4.`;
    }
  }
  return null;
}