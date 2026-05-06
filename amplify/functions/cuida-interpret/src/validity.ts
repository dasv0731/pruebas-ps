import type { CuidaManualScoring, ProfileValidity } from './types';

export function validateProfile(scoring: CuidaManualScoring): ProfileValidity {
  const inv = scoring.indices.invalidez.pd;
  const inc = scoring.indices.inconsistencia.pd;

  if (inv >= 4) {
    return { isValid: false, reason: `Invalidez PD ${inv} ≥ 4: protocolo inválido` };
  }
  if (inc >= 13) {
    return { isValid: false, reason: `Inconsistencia PD ${inc} ≥ 13: protocolo inválido` };
  }
  if (inc >= 10 && inv >= 2) {
    return {
      isValid: false,
      reason: `Inconsistencia PD ${inc} ≥ 10 con Invalidez PD ${inv} ≥ 2: protocolo cuestionable`,
    };
  }
  return { isValid: true, reason: null };
}
