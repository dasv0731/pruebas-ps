/**
 * Baremos del STAIC (Tabla 7 del manual TEA), transcritos de
 * correccion/STAIC-guia-de-correccion.md §4.
 *
 * Conversión de puntuación directa (PD, 20-60) a PERCENTIL (1-99) y puntuación
 * típica "S" (media 50, Dt 20), por SEXO y GRUPO DE CURSO y por ESCALA
 * (Estado A-E, Rasgo A-R). Grupos (§3 Paso 5):
 *   - G1 = 4.º-6.º de Primaria
 *   - G2 = 1.º de ESO a 1.º de Bachillerato
 * El manual NO publica puntos de corte clínicos: interpretación normativa/relativa.
 *
 * La Tabla 7 está tabulada por percentil; cada celda da la PD (o rango de PD) que
 * corresponde a ese percentil. Aquí se invierte para PD -> percentil buscando la
 * banda de PD que contiene la PD del sujeto; en huecos se interpola (§3 Paso 6).
 */

export type StaicScale = 'estado' | 'rasgo';
export type Sex = 'MALE' | 'FEMALE';
export type StaicCourseGroup = 'G1' | 'G2';

export interface StaicNorm {
  percentil: number;
  s: number;
}

interface Anchor {
  percentil: number;
  s: number;
  pdMin: number;
  pdMax: number;
}

// Puntuación S por percentil (constante en todos los grupos, Tabla 7).
const S_BY_PERCENTIL: Record<number, number> = {
  99: 97, 98: 91, 97: 87, 96: 85, 95: 83, 90: 76, 85: 71, 80: 67, 75: 63, 70: 60,
  65: 58, 60: 55, 55: 52, 50: 50, 45: 48, 40: 45, 35: 42, 30: 40, 25: 37, 20: 33,
  15: 29, 10: 24, 5: 17, 4: 15, 3: 12, 2: 9, 1: 3,
};

type Cell = number | [number, number];
type GroupCol = Record<number, Cell>;

const G1_V_AE: GroupCol = {
  99: [50, 60], 98: [47, 49], 97: 46, 95: 45, 90: [37, 44], 85: [35, 36], 80: 34,
  75: 33, 70: 32, 60: 31, 50: 30, 45: 29, 35: 28, 30: 27, 25: 26, 20: 25, 15: 24,
  10: [22, 23], 5: 21, 2: 20,
};
const G1_V_AR: GroupCol = {
  99: [50, 60], 98: 49, 97: 48, 96: 47, 95: 46, 90: [43, 45], 85: 42, 80: [40, 41],
  75: [38, 39], 70: 37, 65: 36, 60: 35, 55: 34, 50: 33, 40: 32, 35: 31, 30: 30,
  25: 29, 20: 28, 15: 27, 10: 26, 5: 25, 4: 24, 2: 23, 1: [20, 22],
};
const G1_M_AE: GroupCol = {
  99: [49, 60], 98: [46, 48], 97: [44, 45], 96: [42, 43], 95: [40, 41], 90: [35, 39],
  85: 34, 80: 33, 75: 32, 70: 31, 65: 30, 50: 29, 45: 28, 40: 27, 30: 26, 20: 25,
  15: 24, 10: 23, 5: 22, 4: 21, 1: 20,
};
const G1_M_AR: GroupCol = {
  99: [51, 60], 98: 50, 97: [48, 49], 96: 47, 95: 46, 90: [44, 45], 85: [42, 43],
  80: 41, 75: [39, 40], 70: 38, 65: 37, 60: 36, 55: 35, 50: 34, 45: 33, 40: 32,
  35: 31, 25: 30, 20: 29, 15: 28, 10: [26, 27], 5: 25, 3: 24, 2: 23, 1: [20, 22],
};
const G2_V_AE: GroupCol = {
  99: [48, 60], 98: 47, 97: [44, 46], 96: 43, 95: 42, 90: [38, 41], 85: [36, 37],
  80: 35, 75: 34, 65: 33, 60: 32, 50: 31, 45: 30, 30: 29, 25: 28, 20: 27, 15: 26,
  10: [24, 25], 5: 23, 4: 22, 2: 21, 1: 20,
};
const G2_V_AR: GroupCol = {
  99: [49, 60], 98: 48, 97: 47, 96: 46, 95: 45, 90: [43, 44], 85: 42, 80: 41,
  75: 40, 70: 39, 65: 38, 60: 37, 55: 36, 50: 35, 45: 34, 40: 33, 35: 32, 30: 31,
  25: 30, 20: 29, 15: 28, 10: [26, 27], 5: 25, 4: 24, 2: 23, 1: [20, 22],
};
const G2_M_AE: GroupCol = {
  99: [49, 60], 98: [47, 48], 97: 46, 96: 45, 95: 44, 90: [40, 43], 85: [38, 39],
  80: 37, 75: [35, 36], 70: 34, 65: 33, 60: 32, 50: 31, 45: 30, 30: 29, 25: 28,
  20: 27, 15: 26, 10: 25, 5: 24, 4: 23, 3: 22, 2: 21, 1: 20,
};
const G2_M_AR: GroupCol = {
  99: [53, 60], 98: 52, 97: 51, 96: 50, 95: 49, 90: [46, 48], 85: [44, 45], 80: 43,
  75: 42, 70: 41, 65: 40, 60: 39, 55: 38, 50: 37, 45: 36, 40: 35, 35: 34, 30: 33,
  25: 32, 20: 31, 15: 30, 10: [28, 29], 5: 27, 3: 26, 2: 25, 1: [20, 24],
};

const GROUPS: Record<string, GroupCol> = {
  'G1|MALE|estado': G1_V_AE,
  'G1|MALE|rasgo': G1_V_AR,
  'G1|FEMALE|estado': G1_M_AE,
  'G1|FEMALE|rasgo': G1_M_AR,
  'G2|MALE|estado': G2_V_AE,
  'G2|MALE|rasgo': G2_V_AR,
  'G2|FEMALE|estado': G2_M_AE,
  'G2|FEMALE|rasgo': G2_M_AR,
};

function toAnchors(col: GroupCol): Anchor[] {
  return Object.entries(col)
    .map(([p, pd]) => {
      const percentil = Number(p);
      const [pdMin, pdMax] = Array.isArray(pd) ? pd : [pd, pd];
      return { percentil, s: S_BY_PERCENTIL[percentil], pdMin, pdMax };
    })
    .sort((a, b) => a.pdMin - b.pdMin);
}

// Pares (percentil, S) ordenados, para interpolar S de un percentil intermedio.
const S_ANCHORS = Object.entries(S_BY_PERCENTIL)
  .map(([p, s]) => ({ percentil: Number(p), s }))
  .sort((a, b) => a.percentil - b.percentil);

function sForPercentil(percentil: number): number {
  for (const a of S_ANCHORS) if (a.percentil === percentil) return a.s;
  if (percentil <= S_ANCHORS[0].percentil) return S_ANCHORS[0].s;
  const last = S_ANCHORS[S_ANCHORS.length - 1];
  if (percentil >= last.percentil) return last.s;
  for (let i = 0; i < S_ANCHORS.length - 1; i++) {
    const lo = S_ANCHORS[i];
    const hi = S_ANCHORS[i + 1];
    if (percentil > lo.percentil && percentil < hi.percentil) {
      const frac = (percentil - lo.percentil) / (hi.percentil - lo.percentil);
      return Math.round(lo.s + frac * (hi.s - lo.s));
    }
  }
  return 50;
}

interface GroupKey {
  courseGroup: StaicCourseGroup;
  sex: Sex;
  scale: StaicScale;
}

/**
 * Deriva el grupo de curso desde la edad cuando no se dispone del curso exacto.
 * G1 = 4.º-6.º Primaria (≈9-11 años); G2 = 1.º ESO-1.º Bach. (≈12-16). Preferir
 * el curso real si se conoce.
 */
export function staicCourseGroupFromAge(ageYears: number): StaicCourseGroup {
  return ageYears <= 11 ? 'G1' : 'G2';
}

/**
 * Convierte una PD (20-60) a percentil y puntuación S para un grupo
 * sexo·curso·escala. Interpola en huecos entre anclas. Null si faltan datos.
 */
export function staicLookup(pd: number, key: GroupKey): StaicNorm | null {
  const col = GROUPS[`${key.courseGroup}|${key.sex}|${key.scale}`];
  if (!col) return null;
  const anchors = toAnchors(col);
  if (!anchors.length) return null;

  for (const a of anchors) {
    if (pd >= a.pdMin && pd <= a.pdMax) {
      return { percentil: a.percentil, s: a.s };
    }
  }

  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (pd < first.pdMin) return { percentil: first.percentil, s: first.s };
  if (pd > last.pdMax) return { percentil: last.percentil, s: last.s };

  for (let i = 0; i < anchors.length - 1; i++) {
    const lo = anchors[i];
    const hi = anchors[i + 1];
    if (pd > lo.pdMax && pd < hi.pdMin) {
      const frac = (pd - lo.pdMax) / (hi.pdMin - lo.pdMax);
      const percentil = Math.round(lo.percentil + frac * (hi.percentil - lo.percentil));
      return { percentil, s: sForPercentil(percentil) };
    }
  }
  return null;
}
