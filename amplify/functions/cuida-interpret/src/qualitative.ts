import type { QualLevel, QualitativeLevel, CuidaEscalas, CuidaCuidado } from './types';

export function getQualLevel(en: number): QualLevel {
  if (en === 1) return 'MUY_BAJO';
  if (en <= 3) return 'BAJO';
  if (en <= 6) return 'MEDIO';
  if (en <= 8) return 'ALTO';
  return 'MUY_ALTO';
}

export function computeQualitativeLevels(
  escalas: CuidaEscalas,
  cuidado: CuidaCuidado,
  ds: number,
): Record<string, QualitativeLevel> {
  const result: Record<string, QualitativeLevel> = {};

  for (const [key, en] of Object.entries(escalas)) {
    result[key] = { en: en as number, level: getQualLevel(en as number) };
  }
  for (const [key, en] of Object.entries(cuidado)) {
    result[key] = { en: en as number, level: getQualLevel(en as number) };
  }
  result['deseabilidadSocial'] = { en: ds, level: getQualLevel(ds) };

  return result;
}
