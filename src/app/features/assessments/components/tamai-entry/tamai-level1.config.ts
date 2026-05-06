import { ScaleNode, SectionBlock, TamaiLevelConfig, flattenScaleNodes } from './tamai-level-config';

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
        node('P1', 'Desajuste disociativo', 1, 'inadaptacion'),
        node('P2', 'Autodesajuste', 1, 'inadaptacion', [
          node('P21', 'Cogniafección', 2, 'inadaptacion'),
          node('P22', 'Cognipunición', 2, 'inadaptacion', [
            node('P221', 'Intrapunición', 3, 'inadaptacion'),
            node('P222', 'Depresión', 3, 'inadaptacion'),
            node('P223', 'Somatización', 3, 'inadaptacion'),
          ]),
        ]),
      ]),
    ],
  },
  {
    title: 'Inadaptación escolar',
    nodes: [
      node('E', 'Inadaptación escolar', 0, 'inadaptacion', [
        node('E1', 'Inadaptación escolar externa', 1, 'inadaptacion'),
        node('E2', 'Aversión a la institución', 1, 'inadaptacion'),
        node('E3', 'Aversión al aprendizaje', 1, 'inadaptacion'),
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
        node('S2', 'Restricción social', 1, 'inadaptacion', [
          node('S21', 'Introversión', 2, 'inadaptacion'),
          node('S22', 'Hostiligencia', 2, 'inadaptacion'),
        ]),
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
          node('Pa31', 'Estilo punitivo', 2, 'parental'),
          node('Pa32', 'Estilo despreocupado', 2, 'parental'),
          node('Pa33', 'Estilo perfeccionista', 2, 'parental'),
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
          node('M31', 'Estilo punitivo', 2, 'parental'),
          node('M32', 'Estilo despreocupado', 2, 'parental'),
          node('M33', 'Estilo perfeccionista', 2, 'parental'),
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

export const TAMAI_LEVEL1_CONFIG: TamaiLevelConfig = {
  level: 'I',
  ageRange: { min: 8, max: 11 },
  blocks,
  baremos: [
    { code: 'N-I-V', label: 'N-I Varones (8-11 años)', validForSex: ['MALE'] },
    { code: 'N-I-M', label: 'N-I Mujeres (8-11 años)', validForSex: ['FEMALE'] },
  ],
  allCodes: flattenScaleNodes(blocks),
};
