import { TestScoring } from '../../models/test.interfaces';

/**
 * El CDI NO se corrige en el frontend: se corrige en la Lambda `cdi-score`
 * (con la inversión de ítems y los baremos TEA reales). El scoring local previo
 * era un placeholder con el mapa de ítems incompleto (solo 3 de 27 definidos),
 * que producía puntuaciones clínicamente inválidas. Para que no pueda usarse por
 * error, `score()` lanza en vez de devolver un resultado erróneo.
 *
 * Rutas correctas: `CdiScoringService.scoreAuthenticated()` / `scorePublic()`.
 */
export const CDI_SCORING: TestScoring = {
  score(): never {
    throw new Error(
      'El CDI debe corregirse en la Lambda cdi-score (CdiScoringService), no con el scoring local.',
    );
  },
};