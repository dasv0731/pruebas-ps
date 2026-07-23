import { ScaleNode, SectionBlock, TamaiLevelConfig, flattenScaleNodes } from './tamai-level-config';

/**
 * TAMAI Nivel 2 (adolescentes). Estructura de escalas tomada del perfil de
 * resultados de TEACorrige (TAMAI-2). Cada escala se transcribe con su PD y su
 * Pc (percentil) desde el perfil.
 */
const node = (
  code: string,
  label: string,
  depth: number,
  type: ScaleNode['type'],
  children?: ScaleNode[],
): ScaleNode => ({ code, label, depth, type, ...(children ? { children } : {}) });

const blocks: SectionBlock[] = [
  {
    title: 'Escalas de Control',
    nodes: [
      node('Contr', 'Contradicciones', 0, 'control'),
      node('PI', 'Pro-imagen', 0, 'control'),
    ],
  },
  {
    title: 'Inadaptación general',
    nodes: [
      node('G', 'Inadaptación general', 0, 'inadaptacion'),
    ],
  },
  {
    title: 'Inadaptación personal',
    nodes: [
      node('P', 'Inadaptación personal', 0, 'inadaptacion', [
        node('P1', 'Insatisfacción personal', 1, 'inadaptacion'),
        node('P2', 'Desajuste afectivo', 1, 'inadaptacion', [
          node('P21', 'Cogniafección', 2, 'inadaptacion'),
          node('P22', 'Cognipunición', 2, 'inadaptacion', [
            node('P221', 'Somatización', 3, 'inadaptacion'),
            node('P222', 'Depresión-intrapunición', 3, 'inadaptacion'),
          ]),
        ]),
        node('P3', 'Autosuficiencia defensiva', 1, 'inadaptacion'),
      ]),
    ],
  },
  {
    title: 'Inadaptación escolar',
    nodes: [
      node('E', 'Inadaptación escolar', 0, 'inadaptacion', [
        node('E1', 'Aversión a la instrucción', 1, 'inadaptacion', [
          node('E11', 'Hipolaboriosidad', 2, 'inadaptacion'),
          node('E12', 'Hipomotivación', 2, 'inadaptacion'),
          node('E13', 'Aversión al profesor', 2, 'inadaptacion'),
        ]),
        node('E2', 'Indisciplina', 1, 'inadaptacion'),
      ]),
    ],
  },
  {
    title: 'Inadaptación social',
    nodes: [
      node('S', 'Inadaptación social', 0, 'inadaptacion', [
        node('S1', 'Autodesajuste social', 1, 'inadaptacion', [
          node('S11', 'Agresividad social', 2, 'inadaptacion'),
          node('S12', 'Disnomia', 2, 'inadaptacion'),
        ]),
        node('S2', 'Restricción social', 1, 'inadaptacion'),
      ]),
    ],
  },
  {
    title: 'Insatisfacción familiar',
    nodes: [
      node('F', 'Insatisfacción ambiente familiar', 0, 'inadaptacion'),
      node('H', 'Insatisfacción con los hermanos', 0, 'inadaptacion'),
    ],
  },
  {
    title: 'Educación padre',
    nodes: [
      node('Pa', 'Educación adecuada padre', 0, 'parental', [
        node('Pa1', 'Educación asistencial-personal', 1, 'parental'),
        node('Pa2', 'Permisivismo', 1, 'parental'),
        node('Pa3', 'Restricción', 1, 'parental', [
          node('Pa31', 'Perfeccionismo hipernómico', 2, 'parental'),
          node('Pa32', 'Estilo aversivo', 2, 'parental', [
            node('Pa321', 'Rechazo afectivo', 3, 'parental'),
            node('Pa322', 'Perfeccionismo hostil', 3, 'parental'),
            node('Pa323', 'Marginación afectiva', 3, 'parental'),
          ]),
        ]),
      ]),
    ],
  },
  {
    title: 'Educación madre',
    nodes: [
      node('M', 'Educación adecuada madre', 0, 'parental', [
        node('M1', 'Educación asistencial-personal', 1, 'parental'),
        node('M2', 'Permisivismo', 1, 'parental'),
        node('M3', 'Restricción', 1, 'parental', [
          node('M31', 'Asistencia restrictiva', 2, 'parental', [
            node('M311', 'Marginación afectiva', 3, 'parental'),
            node('M312', 'Rechazo afectivo', 3, 'parental'),
          ]),
          node('M32', 'Personalización restrictiva', 2, 'parental', [
            node('M321', 'Perfeccionismo hostil', 3, 'parental'),
            node('M322', 'Perfeccionismo hipernómico', 3, 'parental'),
          ]),
        ]),
      ]),
    ],
  },
  {
    title: 'Discrepancia',
    nodes: [
      node('Dis', 'Discrepancia educativa', 0, 'discrepancia'),
    ],
  },
];

export const TAMAI_LEVEL2_CONFIG: TamaiLevelConfig = {
  level: 'II',
  ageRange: { min: 12, max: 14 },
  blocks,
  baremos: [
    { code: 'N-II-V', label: 'N-II Varones (12-14 años)', validForSex: ['MALE'] },
    { code: 'N-II-M', label: 'N-II Mujeres (12-14 años)', validForSex: ['FEMALE'] },
  ],
  allCodes: flattenScaleNodes(blocks),
};
