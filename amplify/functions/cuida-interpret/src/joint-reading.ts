import type { JointReadingFlag, CuidaEscalas, CuidaCuidado } from './types';

export function detectJointReadingFlags(
  escalas: CuidaEscalas,
  cuidado: CuidaCuidado,
): JointReadingFlag[] {
  const flags: JointReadingFlag[] = [];

  const al = escalas.altruismo;
  const em = escalas.empatia;
  const as_ = escalas.asertividad;
  const rf = escalas.reflexividad;
  const tf = escalas.toleranciaFrustracion;
  const fl = escalas.flexibilidad;
  const ind = escalas.independencia;
  const ag = cuidado.agresividad;

  if (al >= 7 && em >= 7) {
    flags.push({
      pattern: 'ALTRUISMO_ALTO_EMPATIA_ALTA',
      description:
        'Conducta de ayuda saludable: la predisposición a dar se sostiene en comprensión emocional genuina del otro.',
      scalesInvolved: ['altruismo', 'empatia'],
    });
  }

  if (al >= 7 && em <= 3) {
    flags.push({
      pattern: 'ALTRUISMO_ALTO_EMPATIA_BAJA',
      description:
        'Ayuda motivada por satisfacción personal más que por comprensión del otro. Explorar motivación del cuidado en entrevista.',
      scalesInvolved: ['altruismo', 'empatia'],
    });
  }

  if (as_ >= 7 && rf <= 3 && tf <= 3) {
    flags.push({
      pattern: 'ASERTIVIDAD_ALTA_REFLEXIVIDAD_BAJA_TOLERANCIA_BAJA',
      description:
        'Posible agresividad encubierta bajo apariencia asertiva. Contrastar con escala de Agresividad y entrevista clínica.',
      scalesInvolved: ['asertividad', 'reflexividad', 'toleranciaFrustracion'],
    });
  }

  if (fl >= 7 && (as_ <= 3 || ind <= 3)) {
    const scalesInvolved = ['flexibilidad'];
    if (as_ <= 3) scalesInvolved.push('asertividad');
    if (ind <= 3) scalesInvolved.push('independencia');
    flags.push({
      pattern: 'FLEXIBILIDAD_ALTA_BAJA_AUTONOMIA',
      description:
        'Riesgo de condescendencia: la alta flexibilidad puede responder a dificultad para sostener criterio propio, no a genuina adaptabilidad.',
      scalesInvolved,
    });
  }

  if (em === 9 && as_ <= 3 && ind <= 3 && al >= 7) {
    flags.push({
      pattern: 'EMPATIA_MUY_ALTA_BAJA_AUTONOMIA_ALTRUISMO_ALTO',
      description:
        'Riesgo de vínculos falsos: hiperresponsividad emocional sin autonomía puede derivar en cuidado indiscriminado o agotamiento del cuidador.',
      scalesInvolved: ['empatia', 'asertividad', 'independencia', 'altruismo'],
    });
  }

  if (ag <= 3) {
    flags.push({
      pattern: 'AGRESIVIDAD_BAJA',
      description:
        'Agresividad muy baja: determinar en entrevista si corresponde a apego ansioso o estilo evitativo en las relaciones.',
      scalesInvolved: ['agresividad'],
    });
  }

  return flags;
}
