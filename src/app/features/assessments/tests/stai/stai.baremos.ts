/**
 * Baremos del STAI (Tabla 9 del manual TEA, Forma X), transcritos de
 * correccion/STAI-guia-de-correccion.md §4.
 *
 * Conversión de puntuación directa (PD, 0-60) a CENTIL y DECATIPO, por
 * grupo de SEXO y EDAD y por ESCALA (Estado A/E, Rasgo A/R). Grupos de edad
 * (§4.1): Adolescente ≤ 19 años; Adulto ≥ 20 años. El manual NO publica puntos
 * de corte clínicos: la interpretación es normativa/relativa (posición frente
 * a la muestra), no diagnóstica.
 *
 * La Tabla 9 está tabulada por centil; cada celda da la PD (o rango de PD en los
 * extremos) que corresponde a ese centil en ese grupo. Aquí se invierte para
 * hacer PD -> centil: se busca la banda de PD que contiene la PD del sujeto. Si
 * la PD cae en un hueco entre dos centiles tabulados, se interpola linealmente
 * (§4.2).
 */

export type StaiScale = 'estado' | 'rasgo';
export type Sex = 'MALE' | 'FEMALE';

export interface StaiNorm {
  centil: number;
  decatipo: number;
}

/** Un ancla de la tabla: la PD (o rango [min,max]) asignada a un centil/decatipo. */
interface Anchor {
  centil: number;
  decatipo: number;
  pdMin: number;
  pdMax: number;
}

// Decatipo por centil (constante en todos los grupos, Tabla 9).
const DECATIPO_BY_CENTIL: Record<number, number> = {
  99: 10, 97: 9, 96: 9, 95: 9, 90: 8, 89: 8, 85: 8, 80: 7, 77: 7, 75: 7, 70: 7,
  65: 6, 60: 6, 55: 6, 50: 6, 45: 5, 40: 5, 35: 5, 30: 4, 25: 4, 23: 4, 20: 4,
  15: 3, 11: 3, 10: 3, 5: 2, 4: 2, 1: 1,
};

// Cada grupo se define como { centil: pd } donde pd es un número o [min,max].
// Los centiles ausentes ("—" en la tabla) simplemente no se incluyen.
type Cell = number | [number, number];
type GroupCol = Record<number, Cell>;

const ADOL_V_ESTADO: GroupCol = {
  99: [47, 60], 97: 45, 96: 44, 95: 43, 90: 38, 89: 37, 85: 36, 80: 34, 77: 32,
  75: 31, 70: 28, 65: 26, 60: 24, 55: 22, 50: 20, 45: 19, 40: 17, 35: 16, 30: 14,
  25: 13, 20: 12, 15: 11, 10: 10, 5: 9, 4: 8, 1: [0, 2],
};
const ADOL_V_RASGO: GroupCol = {
  99: [46, 60], 97: 41, 96: 40, 95: 39, 90: 33, 89: 32, 85: 30, 80: 28, 77: 27,
  75: 26, 70: 24, 65: 23, 60: 22, 55: 21, 50: 20, 45: 19, 40: 18, 35: 17, 30: 16,
  25: 15, 20: 14, 15: 13, 10: 12, 5: 11, 4: 10, 1: [0, 6],
};
const ADOL_M_ESTADO: GroupCol = {
  99: [53, 60], 97: 44, 96: [42, 43], 95: 41, 90: 39, 89: 38, 85: 36, 80: 34,
  77: 33, 75: 31, 70: 28, 65: 26, 60: 25, 55: 23, 50: 22, 45: 20, 40: 19, 35: 18,
  30: 17, 25: 16, 23: 15, 20: 14, 15: 13, 11: 12, 10: 11, 5: 8, 4: 7, 1: [0, 4],
};
const ADOL_M_RASGO: GroupCol = {
  99: [49, 60], 97: 43, 96: 42, 95: 41, 90: 36, 89: 35, 85: 33, 80: 31, 77: 30,
  75: 29, 70: 27, 65: 26, 60: 25, 55: 23, 50: 22, 45: 21, 40: 20, 35: 19, 30: 18,
  25: 17, 20: 16, 15: 15, 11: 14, 10: 13, 5: 12, 4: 11, 1: [0, 7],
};
const ADULT_V_ESTADO: GroupCol = {
  99: [47, 60], 97: 43, 96: 42, 95: [40, 41], 90: 37, 89: 36, 85: 33, 80: 30,
  77: 29, 75: 28, 70: 25, 65: 23, 60: 21, 55: 20, 50: 19, 45: 18, 40: 16, 35: 15,
  25: 14, 23: 13, 20: 12, 15: 10, 11: 9, 10: 8, 5: 6, 4: 5, 1: [0, 2],
};
const ADULT_V_RASGO: GroupCol = {
  99: [46, 60], 97: [39, 40], 96: 38, 95: 37, 90: 33, 89: 32, 85: 29, 80: 27,
  77: 26, 75: 25, 70: 24, 65: 23, 60: 21, 55: 20, 50: 19, 45: 18, 40: 17, 35: 16,
  30: 15, 25: 14, 20: 13, 15: 11, 11: 10, 10: 9, 5: 8, 4: 7, 1: [0, 4],
};
const ADULT_M_ESTADO: GroupCol = {
  99: [54, 60], 97: 49, 96: 48, 95: 47, 90: 41, 89: 40, 85: 37, 80: 34, 77: 32,
  75: 31, 70: 29, 65: 26, 60: 24, 55: 23, 50: 21, 45: 19, 40: 18, 35: 17, 30: 16,
  25: 15, 23: 14, 20: 13, 15: 12, 11: 11, 10: 10, 5: 7, 4: 6, 1: [0, 2],
};
const ADULT_M_RASGO: GroupCol = {
  99: [49, 60], 97: 45, 96: 44, 95: 43, 90: 40, 89: 39, 85: 37, 80: 34, 77: 33,
  75: 32, 70: 30, 65: 29, 60: 27, 55: 26, 50: 24, 45: 23, 40: 21, 35: 20, 30: 18,
  25: 17, 20: 16, 15: 14, 11: 13, 10: 12, 5: 11, 4: 10, 1: [0, 7],
};

function toAnchors(col: GroupCol): Anchor[] {
  return Object.entries(col)
    .map(([c, pd]) => {
      const centil = Number(c);
      const [pdMin, pdMax] = Array.isArray(pd) ? pd : [pd, pd];
      return { centil, decatipo: DECATIPO_BY_CENTIL[centil], pdMin, pdMax };
    })
    .sort((a, b) => a.pdMin - b.pdMin); // orden ascendente de PD
}

interface GroupKey {
  ageGroup: 'ADOL' | 'ADULT';
  sex: Sex;
  scale: StaiScale;
}

const GROUPS: Record<string, GroupCol> = {
  'ADOL|MALE|estado': ADOL_V_ESTADO,
  'ADOL|MALE|rasgo': ADOL_V_RASGO,
  'ADOL|FEMALE|estado': ADOL_M_ESTADO,
  'ADOL|FEMALE|rasgo': ADOL_M_RASGO,
  'ADULT|MALE|estado': ADULT_V_ESTADO,
  'ADULT|MALE|rasgo': ADULT_V_RASGO,
  'ADULT|FEMALE|estado': ADULT_M_ESTADO,
  'ADULT|FEMALE|rasgo': ADULT_M_RASGO,
};

export function staiAgeGroup(ageYears: number): 'ADOL' | 'ADULT' | null {
  if (ageYears < 16) return null;
  return ageYears <= 19 ? 'ADOL' : 'ADULT';
}

/**
 * Convierte una PD (0-60) a centil y decatipo para un grupo sexo·edad·escala.
 * Interpola linealmente el centil cuando la PD cae en un hueco entre anclas
 * (§4.2). Devuelve null si faltan datos (sexo/edad) para elegir el baremo.
 */
export function staiLookup(
  pd: number,
  key: GroupKey,
): StaiNorm | null {
  const col = GROUPS[`${key.ageGroup}|${key.sex}|${key.scale}`];
  if (!col) return null;
  const anchors = toAnchors(col);
  if (!anchors.length) return null;

  // Dentro de una banda [pdMin, pdMax] (incluye rangos de los extremos).
  for (const a of anchors) {
    if (pd >= a.pdMin && pd <= a.pdMax) {
      return { centil: a.centil, decatipo: a.decatipo };
    }
  }

  // Fuera de rango por debajo/encima.
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (pd < first.pdMin) return { centil: first.centil, decatipo: first.decatipo };
  if (pd > last.pdMax) return { centil: last.centil, decatipo: last.decatipo };

  // Hueco entre dos anclas: interpolar el centil linealmente por PD.
  for (let i = 0; i < anchors.length - 1; i++) {
    const lo = anchors[i];
    const hi = anchors[i + 1];
    if (pd > lo.pdMax && pd < hi.pdMin) {
      const frac = (pd - lo.pdMax) / (hi.pdMin - lo.pdMax);
      const centil = Math.round(lo.centil + frac * (hi.centil - lo.centil));
      // Decatipo por el centil interpolado (banda más cercana de la tabla).
      const decatipo = decatipoForCentil(centil);
      return { centil, decatipo };
    }
  }
  return null;
}

/** Decatipo aproximado para un centil interpolado (banda de la Tabla 9 que lo cubre). */
function decatipoForCentil(centil: number): number {
  // Bandas de decatipo por centil según la columna Decatipo de la Tabla 9.
  if (centil >= 98) return 10;
  if (centil >= 91) return 9;
  if (centil >= 82) return 8; // 85-90 = 8; se extiende la banda alta
  if (centil >= 67) return 7; // 70-80
  if (centil >= 48) return 6; // 50-65
  if (centil >= 33) return 5; // 35-45
  if (centil >= 18) return 4; // 20-30
  if (centil >= 7) return 3;  // 10-15
  if (centil >= 3) return 2;  // 4-5
  return 1;
}
