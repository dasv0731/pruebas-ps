import type { DeseabilidadInterpretation, CuidaEscalas, CuidaCuidado } from './types';
import { getQualLevel } from './qualitative';

export function evaluateDeseabilidad(
  ds: number,
  escalas: CuidaEscalas,
  cuidado: CuidaCuidado,
): DeseabilidadInterpretation {
  const contaminationRisk = ds >= 7;
  const scalesToInterpretWithCaution: string[] = [];

  if (contaminationRisk) {
    const allScales: Record<string, number> = { ...escalas, ...cuidado };
    for (const [key, en] of Object.entries(allScales)) {
      if ((en as number) >= 7) scalesToInterpretWithCaution.push(key);
    }
  }

  return {
    en: ds,
    level: getQualLevel(ds),
    contaminationRisk,
    scalesToInterpretWithCaution,
  };
}
