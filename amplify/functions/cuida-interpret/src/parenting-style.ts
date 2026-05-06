import type { ParentingStyleResult, ParentingStyle, CuidaEscalas, CuidaCuidado } from './types';

interface StyleCriterion {
  key: string;
  source: 'escalas' | 'cuidado';
  direction: 'HIGH' | 'LOW';
}

interface StyleProfile {
  criteria: StyleCriterion[];
  recommendation: string;
}

const STYLE_PROFILES: Record<Exclude<ParentingStyle, 'MIXTO'>, StyleProfile> = {
  INDUCTIVO: {
    criteria: [
      { key: 'autoestima', source: 'escalas', direction: 'HIGH' },
      { key: 'asertividad', source: 'escalas', direction: 'HIGH' },
      { key: 'resolverProblemas', source: 'escalas', direction: 'HIGH' },
      { key: 'equilibrioEmocional', source: 'escalas', direction: 'HIGH' },
      { key: 'empatia', source: 'escalas', direction: 'HIGH' },
      { key: 'flexibilidad', source: 'escalas', direction: 'HIGH' },
      { key: 'reflexividad', source: 'escalas', direction: 'HIGH' },
      { key: 'toleranciaFrustracion', source: 'escalas', direction: 'HIGH' },
      { key: 'agresividad', source: 'cuidado', direction: 'HIGH' },
    ],
    recommendation:
      'Perfil inductivo: alta capacidad empática, equilibrio emocional y disposición a la reflexión. Estilo que favorece el desarrollo autónomo del menor. Fortalezas a potenciar en el proceso.',
  },
  RIGIDO: {
    criteria: [
      { key: 'apertura', source: 'escalas', direction: 'LOW' },
      { key: 'autoestima', source: 'escalas', direction: 'LOW' },
      { key: 'resolverProblemas', source: 'escalas', direction: 'LOW' },
      { key: 'empatia', source: 'escalas', direction: 'LOW' },
      { key: 'equilibrioEmocional', source: 'escalas', direction: 'LOW' },
      { key: 'flexibilidad', source: 'escalas', direction: 'LOW' },
      { key: 'toleranciaFrustracion', source: 'escalas', direction: 'LOW' },
    ],
    recommendation:
      'Perfil rígido: dificultad para adaptarse a las necesidades cambiantes del menor y baja tolerancia a la frustración. Trabajar apertura al cambio y estrategias de regulación emocional.',
  },
  PERMISIVO: {
    criteria: [
      { key: 'autoestima', source: 'escalas', direction: 'LOW' },
      { key: 'asertividad', source: 'escalas', direction: 'LOW' },
      { key: 'resolverProblemas', source: 'escalas', direction: 'LOW' },
      { key: 'independencia', source: 'escalas', direction: 'LOW' },
      { key: 'flexibilidad', source: 'escalas', direction: 'HIGH' },
      { key: 'agresividad', source: 'cuidado', direction: 'LOW' },
    ],
    recommendation:
      'Perfil permisivo: dificultad para establecer límites consistentes. Trabajar asertividad, autoconfianza y estrategias de resolución de conflictos con el menor.',
  },
  SOBREPROTECTOR: {
    criteria: [
      { key: 'apertura', source: 'escalas', direction: 'LOW' },
      { key: 'independencia', source: 'escalas', direction: 'LOW' },
      { key: 'empatia', source: 'escalas', direction: 'LOW' },
      { key: 'flexibilidad', source: 'escalas', direction: 'LOW' },
      { key: 'agresividad', source: 'cuidado', direction: 'LOW' },
    ],
    recommendation:
      'Perfil sobreprotector: tendencia a limitar la autonomía del menor, posiblemente por dificultad para gestionar la separación o la incertidumbre. Explorar vínculos afectivos y tolerancia a la independencia en entrevista.',
  },
};

function getCriterionValue(
  criterion: StyleCriterion,
  escalas: CuidaEscalas,
  cuidado: CuidaCuidado,
): number {
  if (criterion.source === 'escalas') return (escalas as any)[criterion.key] ?? 5;
  return (cuidado as any)[criterion.key] ?? 5;
}

function meetsCriterion(en: number, direction: 'HIGH' | 'LOW'): boolean {
  return direction === 'HIGH' ? en >= 7 : en <= 3;
}

export function inferParentingStyle(
  escalas: CuidaEscalas,
  cuidado: CuidaCuidado,
): ParentingStyleResult {
  let bestStyle: Exclude<ParentingStyle, 'MIXTO'> = 'INDUCTIVO';
  let bestScore = -1;
  const scores: Record<string, number> = {};

  for (const [styleName, profile] of Object.entries(STYLE_PROFILES) as [
    Exclude<ParentingStyle, 'MIXTO'>,
    StyleProfile,
  ][]) {
    let matched = 0;
    for (const c of profile.criteria) {
      const en = getCriterionValue(c, escalas, cuidado);
      if (meetsCriterion(en, c.direction)) matched++;
    }
    const score = matched / profile.criteria.length;
    scores[styleName] = score;
    if (score > bestScore) {
      bestScore = score;
      bestStyle = styleName;
    }
  }

  // Check for tie or low concordance
  const sortedScores = Object.values(scores).sort((a, b) => b - a);
  const isTied = sortedScores.length >= 2 && sortedScores[0] - sortedScores[1] < 0.1;
  const isLowConcordance = bestScore < 0.35;

  if (isLowConcordance || isTied) {
    return {
      predominantStyle: 'MIXTO',
      confidence: 'BAJA',
      supportingScales: [],
      recommendation:
        'Perfil mixto o indeterminado: no se observa un estilo parental predominante. Contrastar con entrevista clínica y otras fuentes de información.',
    };
  }

  // Find supporting scales
  const profile = STYLE_PROFILES[bestStyle];
  const supportingScales = profile.criteria
    .filter((c) => meetsCriterion(getCriterionValue(c, escalas, cuidado), c.direction))
    .map((c) => c.key);

  const confidence: 'ALTA' | 'MEDIA' | 'BAJA' =
    bestScore >= 0.7 ? 'ALTA' : bestScore >= 0.5 ? 'MEDIA' : 'BAJA';

  return {
    predominantStyle: bestStyle,
    confidence,
    supportingScales,
    recommendation: profile.recommendation,
  };
}
