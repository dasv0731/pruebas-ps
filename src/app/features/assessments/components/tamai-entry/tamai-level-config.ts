export type TamaiLevel = 'I' | 'II' | 'III';
export type TamaiSex = 'MALE' | 'FEMALE';

export type ScaleType =
  | 'control'
  | 'inadaptacion'
  | 'satisfaccion'
  | 'parental'
  | 'discrepancia';

export interface ScaleNode {
  code: string;
  label: string;
  depth: number;
  type: ScaleType;
  children?: ScaleNode[];
}

export interface SectionBlock {
  title: string;
  nodes: ScaleNode[];
}

export interface BaremoOption {
  code: string;
  label: string;
  validForSex: TamaiSex[];
}

export interface TamaiLevelConfig {
  level: TamaiLevel;
  ageRange: { min: number; max: number };
  blocks: SectionBlock[];
  baremos: BaremoOption[];
  allCodes: string[];
}

export function flattenScaleNodes(blocks: SectionBlock[]): string[] {
  const out: string[] = [];
  function walk(nodes: ScaleNode[]) {
    for (const n of nodes) {
      out.push(n.code);
      if (n.children?.length) walk(n.children);
    }
  }
  for (const b of blocks) walk(b.nodes);
  return out;
}

export function flattenScaleNodesFull(blocks: SectionBlock[]): ScaleNode[] {
  const out: ScaleNode[] = [];
  function walk(nodes: ScaleNode[]) {
    for (const n of nodes) {
      out.push(n);
      if (n.children?.length) walk(n.children);
    }
  }
  for (const b of blocks) walk(b.nodes);
  return out;
}

export function deriveLevelFromAge(age: number | null | undefined): TamaiLevel {
  if (age == null) return 'I';
  if (age <= 11) return 'I';
  if (age <= 14) return 'II';
  return 'III';
}

export function baremosForSex(
  options: BaremoOption[],
  sex: TamaiSex | null | undefined,
): BaremoOption[] {
  if (!sex) return options;
  return options.filter((b) => b.validForSex.includes(sex));
}
