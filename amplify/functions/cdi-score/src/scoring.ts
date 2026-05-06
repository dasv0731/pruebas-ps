import { RawScores } from './types';

/**
 * Ítems que puntúan de forma DIRECTA (A=0, B=1, C=2).
 * Fuente: manual TEA del CDI, adaptación española.
 */
const DIRECT_ITEMS = new Set([
  1, 3, 4, 6, 9, 12, 14, 17, 19, 20, 22, 23, 26, 27,
]);

/**
 * Ítems que puntúan de forma INVERTIDA (A=2, B=1, C=0).
 * Fuente: manual TEA del CDI, adaptación española.
 */
const INVERTED_ITEMS = new Set([
  2, 5, 7, 8, 10, 11, 13, 15, 16, 18, 21, 24, 25,
]);

/**
 * Ítems que componen la subescala de Disforia (16 ítems, máximo 32).
 * Fuente: manual TEA del CDI, adaptación española.
 */
const DISFORIA_ITEMS = [
  1, 4, 5, 7, 8, 9, 10, 12, 16, 17, 18, 20, 21, 22, 25, 27,
];

/**
 * Ítems que componen la subescala de Autoestima Negativa (11 ítems, máximo 22).
 * Fuente: manual TEA del CDI, adaptación española.
 */
const AUTOESTIMA_ITEMS = [
  2, 3, 6, 11, 13, 14, 15, 19, 23, 24, 26,
];

/**
 * Corrige una respuesta individual (opción elegida 1/2/3) en su puntuación 0/1/2
 * según si el ítem es directo o invertido.
 *
 * @param itemNumber - número de ítem (1-27)
 * @param selectedOption - opción elegida por el evaluado (1, 2 o 3, donde 1=A, 2=B, 3=C)
 * @returns puntuación del ítem (0, 1 o 2)
 */
export function scoreItem(itemNumber: number, selectedOption: number): number {
  if (selectedOption < 1 || selectedOption > 3) {
    throw new Error(
      `Opción inválida para ítem ${itemNumber}: ${selectedOption}. Debe ser 1, 2 o 3.`,
    );
  }

  if (DIRECT_ITEMS.has(itemNumber)) {
    // A=0, B=1, C=2  → option-1
    return selectedOption - 1;
  }

  if (INVERTED_ITEMS.has(itemNumber)) {
    // A=2, B=1, C=0  → 3-option
    return 3 - selectedOption;
  }

  throw new Error(
    `Ítem ${itemNumber} no está clasificado como directo ni invertido.`,
  );
}

/**
 * Corrige las 27 respuestas y devuelve un array de 27 puntuaciones individuales (0, 1 o 2).
 *
 * @param answers - array de 27 respuestas, cada una con la opción elegida (1, 2 o 3)
 * @returns array de 27 puntuaciones corregidas
 */
export function correctAnswers(answers: number[]): number[] {
  if (answers.length !== 27) {
    throw new Error(
      `Se esperaban 27 respuestas, se recibieron ${answers.length}.`,
    );
  }

  const corrected: number[] = [];
  for (let i = 0; i < 27; i++) {
    const itemNumber = i + 1;
    corrected.push(scoreItem(itemNumber, answers[i]));
  }
  return corrected;
}

/**
 * Calcula puntuaciones directas totales a partir de las 27 puntuaciones corregidas.
 *
 * Validación aritmética: Total = Disforia + Autoestima (RC6 del manual).
 *
 * @param correctedScores - array de 27 puntuaciones ya corregidas (0, 1 o 2)
 * @returns { total, disforia, autoestima }
 */
export function calculateRawScores(correctedScores: number[]): RawScores {
  if (correctedScores.length !== 27) {
    throw new Error(
      `Se esperaban 27 puntuaciones, se recibieron ${correctedScores.length}.`,
    );
  }

  const total = correctedScores.reduce((sum, v) => sum + v, 0);

  const disforia = DISFORIA_ITEMS.reduce(
    (sum, itemNumber) => sum + correctedScores[itemNumber - 1],
    0,
  );

  const autoestima = AUTOESTIMA_ITEMS.reduce(
    (sum, itemNumber) => sum + correctedScores[itemNumber - 1],
    0,
  );

  // Validación de coherencia: Total debe ser suma de subescalas
  if (disforia + autoestima !== total) {
    throw new Error(
      `Inconsistencia aritmética: Total=${total}, Disforia+Autoestima=${disforia + autoestima}`,
    );
  }

  return { total, disforia, autoestima };
}

/**
 * Validación mínima del array de respuestas antes de procesar.
 *
 * @param answers - array recibido del cliente
 * @returns null si es válido, mensaje de error si no lo es
 */
export function validateAnswers(answers: unknown): string | null {
  if (!Array.isArray(answers)) {
    return 'Las respuestas no son un array.';
  }
  if (answers.length !== 27) {
    return `Se esperaban 27 respuestas, se recibieron ${answers.length}.`;
  }
  for (let i = 0; i < 27; i++) {
    const a = answers[i];
    if (typeof a !== 'number' || !Number.isInteger(a)) {
      return `Respuesta ${i + 1} no es un número entero: ${a}`;
    }
    if (a < 1 || a > 3) {
      return `Respuesta ${i + 1} fuera de rango: ${a}. Debe ser 1, 2 o 3.`;
    }
  }
  return null;
}