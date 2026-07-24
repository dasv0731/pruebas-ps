import { TestScoring, ScoringResult } from '../../models/test.interfaces';

/**
 * ⚠️ El TAMAI NO se corrige a mano ni por software propio.
 *
 * La clave ítem→factor del TAMAI (qué elemento puntúa en cada factor/subfactor)
 * NO consta en el manual de TEA: la corrección es informática y propiedad de
 * TEACorrige. Cualquier suma "por rangos de índice" es una clave INVENTADA que
 * produciría puntuaciones directas sin fundamento — inaceptable en un informe
 * pericial. Fuente: correccion/TAMAI-guia-de-correccion.md §1, §5, §9.
 *
 * Por eso el flujo real es la TRANSCRIPCIÓN de las PD y PC que devuelve
 * TEACorrige (componentes tamai-entry / tamai-results, source 'TEA_MANUAL_TAMAI').
 * Este `score()` existe solo para cumplir la interfaz `TestScoring`; se bloquea
 * como fail-safe para que nunca se emita una corrección local fabricada.
 */
export const TAMAI_SCORING: TestScoring = {
  score(_answers: number[]): ScoringResult {
    throw new Error(
      'El TAMAI no admite corrección local: sus puntuaciones deben obtenerse de ' +
        'TEACorrige (software oficial de TEA) y transcribirse (PD y PC) en el ' +
        'formulario de entrada del TAMAI. No existe clave ítem→factor publicada.',
    );
  },
};
