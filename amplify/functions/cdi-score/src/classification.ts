import { TotalClassification } from './types';

/**
 * Clasifica el percentil del Total según el manual TEA (página 11 del manual de CDI).
 *
 * Cortes oficiales:
 * - "percentil 90 es indicativa de la existencia de la sintomatología depresiva"
 * - "a partir del percentil 96 el grado de esta existencia se considera severo"
 *
 * Derivación:
 * - Sin sintomatología: Pc 1 a 89
 * - Leve:               Pc 90 a 95
 * - Severa:             Pc 96 a 99
 *
 * Nota sobre percentiles discretos: la tabla oficial TEA solo lista filas Pc 90, 91,
 * 92, 93, 95, 96, 97, 98, 99 en el tramo superior. Los percentiles 86, 87, 88, 89 y 94
 * no existen como filas. El algoritmo de lookup nunca devuelve esos valores para
 * puntuaciones enteras, así que esta clasificación en la práctica solo ve los
 * percentiles listados. Los cortes cubren el 100% del espectro teórico sin huecos.
 *
 * @param pc - percentil del Total (1-99)
 * @returns clasificación cualitativa
 */
export function classifyTotal(pc: number): TotalClassification {
  if (pc < 90) return 'SIN_SINTOMATOLOGIA';
  if (pc < 96) return 'LEVE';
  return 'SEVERA';
}