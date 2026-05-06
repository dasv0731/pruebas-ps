import type { CriticalItemFlag, CuidaEscalas, CuidaCuidado } from './types';

interface ManualCriticalItem {
  itemNumber: number;
  escala: string;
  content: string;
  getEn: (e: CuidaEscalas, c: CuidaCuidado) => number;
  alwaysFlag?: true;
}

const MANUAL_CRITICAL_ITEMS: ManualCriticalItem[] = [
  {
    itemNumber: 99,
    escala: 'Apertura',
    content: 'Me siento incómodo con la gente que es diferente a mí',
    getEn: (e) => e.apertura,
  },
  {
    itemNumber: 3,
    escala: 'Autoestima',
    content: 'Estoy satisfecho de cómo soy',
    getEn: (e) => e.autoestima,
  },
  {
    itemNumber: 102,
    escala: 'Altruismo',
    content: 'Si alguien me pide ayuda por cualquier motivo intento poner una excusa',
    getEn: (e) => e.altruismo,
  },
  {
    itemNumber: 178,
    escala: 'Resolver problemas',
    content: 'En situaciones difíciles considero las diferentes alternativas que hay para afrontarlas',
    getEn: (e) => e.resolverProblemas,
  },
  {
    itemNumber: 38,
    escala: 'Empatía',
    content: 'Los sentimientos de los demás no me preocupan',
    getEn: (e) => e.empatia,
  },
  {
    itemNumber: 2,
    escala: 'Equilibrio emocional',
    content: 'Tengo problemas para dormir',
    getEn: (e) => e.equilibrioEmocional,
  },
  {
    itemNumber: 121,
    escala: 'Flexibilidad',
    content: 'Los límites y las normas nunca deben ser cuestionados o negociados con los hijos',
    getEn: (e) => e.flexibilidad,
  },
  {
    itemNumber: 21,
    escala: 'Independencia',
    content: 'No hago las cosas solo para satisfacer a los demás',
    getEn: (e) => e.independencia,
  },
  {
    itemNumber: 140,
    escala: 'Reflexividad',
    content: 'Hago las cosas sin pararme a pensar mucho en lo que hago',
    getEn: (e) => e.reflexividad,
  },
  {
    itemNumber: 8,
    escala: 'Sociabilidad',
    content: 'Me gusta reunirme con amigos y conversar',
    getEn: (e) => e.sociabilidad,
  },
  {
    itemNumber: 128,
    escala: 'Vínculos afectivos',
    content: 'Pienso que los demás van a estar a mi lado cuando los necesite',
    getEn: (e) => e.vinculosAfectivos,
  },
  {
    itemNumber: 163,
    escala: 'Resolución del duelo',
    content: 'La ausencia de alguien querido no me impide disfrutar plenamente de las cosas',
    getEn: (e) => e.resolucionDuelo,
  },
  {
    itemNumber: 189,
    escala: 'Ideológico',
    content:
      'Con la cantidad de niños que necesitan un hogar me planteo tener hijos en lugar de los propios',
    getEn: () => 5,
    alwaysFlag: true,
  },
];

function isExtreme(en: number): boolean {
  return en <= 2 || en >= 8;
}

export function computeCriticalItemFlags(
  escalas: CuidaEscalas,
  cuidado: CuidaCuidado,
  rawAnswers: number[],
  itemsCriticosTea: Array<{ itemNumber: number; response: number }>,
): CriticalItemFlag[] {
  const flags: CriticalItemFlag[] = [];
  const teaItemSet = new Set(itemsCriticosTea.map((i) => i.itemNumber));

  for (const item of MANUAL_CRITICAL_ITEMS) {
    const en = item.getEn(escalas, cuidado);
    const rawResponse = rawAnswers.length >= item.itemNumber
      ? rawAnswers[item.itemNumber - 1]
      : null;

    const shouldFlag = item.alwaysFlag || isExtreme(en) || teaItemSet.has(item.itemNumber);

    if (shouldFlag) {
      let reason: string;
      if (item.alwaysFlag) {
        reason = 'Ítem ideológico — siempre a esclarecer en entrevista';
      } else if (teaItemSet.has(item.itemNumber)) {
        reason = `Señalado en informe TEA${isExtreme(en) ? ` + Eneatipo ${en} (extremo)` : ''}`;
      } else {
        reason = `Eneatipo ${en} (extremo — ${isExtreme(en) ? '≤2 o ≥8' : 'marcado'})`;
      }

      flags.push({
        itemNumber: item.itemNumber,
        escala: item.escala,
        content: item.content,
        reason,
        rawResponse: rawResponse ?? null,
      });
    }
  }

  return flags;
}
