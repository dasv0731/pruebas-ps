import { TestScoring, ScoringResult } from '../../models/test.interfaces';

/**
 * Corrección del STAIC (Ansiedad Estado-Rasgo para Niños), adaptación española TEA.
 *
 * La respuesta se recoge y se puntúa como opción 1-3. Cada subescala suma 20 ítems
 * → rango 20-60 (mínimo 20 porque cada ítem aporta al menos 1).
 *
 * Ítems invertidos: SOLO en la escala Estado, los redactados en sentido de baja
 * ansiedad (calmado, descansado, relajado, satisfecho, feliz, seguro, bien,
 * agradable, animoso, alegre). Su puntuación se invierte (opción 1→3, 2→2, 3→1).
 * La escala Rasgo del STAIC NO tiene ítems invertidos (todos van en sentido de
 * ansiedad presente).
 *
 * ⚠️ La lista de ítems invertidos sigue la estructura estándar del STAIC pero
 * NO está confirmada contra una fuente en el repositorio (a diferencia del STAI,
 * cuya corrección está en la Lambda). Verificar contra el manual TEA antes de
 * usar en peritaje.
 */
const INVERTED_ESTADO = new Set([1, 4, 6, 8, 9, 10, 11, 13, 16, 18]);

const TOTAL_ITEMS = 40;
const SUBSCALE_MAX = 60; // 20 ítems × 3
const TOTAL_MAX = 120;

/**
 * Puntúa un ítem del STAIC. Opción válida 1-3.
 * Directo: 1→1, 2→2, 3→3. Invertido (solo Estado): 1→3, 2→2, 3→1.
 * Una opción ausente o fuera de rango aporta 0 y se marca como no respondida
 * (rompe intencionadamente el mínimo de 20 para señalar protocolo incompleto).
 */
function scoreStaicItem(itemNumber: number, option: number): number {
  if (!Number.isInteger(option) || option < 1 || option > 3) {
    return 0;
  }
  // Solo los ítems 1-20 (Estado) pueden estar invertidos.
  const inverted = itemNumber <= 20 && INVERTED_ESTADO.has(itemNumber);
  return inverted ? 4 - option : option;
}

export const STAIC_SCORING: TestScoring = {
  score(answers: number[]): ScoringResult {
    let estado = 0;
    let rasgo = 0;
    let answered = 0;

    for (let i = 0; i < TOTAL_ITEMS; i++) {
      const itemNumber = i + 1;
      const option = answers[i];
      if (Number.isInteger(option) && option >= 1 && option <= 3) {
        answered++;
      }
      const corrected = scoreStaicItem(itemNumber, option);
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
