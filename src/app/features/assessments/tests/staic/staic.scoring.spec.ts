import { STAIC_SCORING } from './staic.scoring';

/**
 * STAIC: escala 1-3, rango por subescala 20-60.
 * Solo la escala Estado invierte (ítems 1,4,6,8,9,10,11,13,16,18).
 * La escala Rasgo (21-40) no invierte.
 */
const INVERTED_ESTADO = [1, 4, 6, 8, 9, 10, 11, 13, 16, 18];

function make(fill: number): number[] {
  return Array.from({ length: 40 }, () => fill);
}

describe('STAIC_SCORING', () => {
  it('invierte los 10 ítems positivos de Estado; Rasgo no invierte', () => {
    // Todo opción 1:
    // Estado: 10 invertidos → 3 (=30) + 10 directos → 1 (=10) = 40
    // Rasgo: 20 directos → 1 = 20
    const r = STAIC_SCORING.score(make(1));
    expect(r.subscales!['Ansiedad Estado']).toBe(40);
    expect(r.subscales!['Ansiedad Rasgo']).toBe(20);
    expect(r.totalScore).toBe(60);
  });

  it('todo opción 3', () => {
    // Estado: 10 invertidos → 1 (=10) + 10 directos → 3 (=30) = 40
    // Rasgo: 20 directos → 3 = 60
    const r = STAIC_SCORING.score(make(3));
    expect(r.subscales!['Ansiedad Estado']).toBe(40);
    expect(r.subscales!['Ansiedad Rasgo']).toBe(60);
    expect(r.totalScore).toBe(100);
  });

  it('máxima ansiedad = 120 (Estado invertidos en 1/directos en 3; Rasgo en 3)', () => {
    const answers = Array.from({ length: 40 }, (_, i) => {
      const item = i + 1;
      if (item <= 20) return INVERTED_ESTADO.includes(item) ? 1 : 3;
      return 3;
    });
    const r = STAIC_SCORING.score(answers);
    expect(r.subscales!['Ansiedad Estado']).toBe(60);
    expect(r.subscales!['Ansiedad Rasgo']).toBe(60);
    expect(r.totalScore).toBe(120);
  });

  it('mínima ansiedad = 40 (cada subescala en su mínimo 20)', () => {
    const answers = Array.from({ length: 40 }, (_, i) => {
      const item = i + 1;
      if (item <= 20) return INVERTED_ESTADO.includes(item) ? 3 : 1;
      return 1;
    });
    const r = STAIC_SCORING.score(answers);
    expect(r.subscales!['Ansiedad Estado']).toBe(20);
    expect(r.subscales!['Ansiedad Rasgo']).toBe(20);
    expect(r.totalScore).toBe(40);
  });

  it('cada subescala respondida completa queda en el rango 20-60', () => {
    for (const fill of [1, 2, 3]) {
      const r = STAIC_SCORING.score(make(fill));
      expect(r.subscales!['Ansiedad Estado']).toBeGreaterThanOrEqual(20);
      expect(r.subscales!['Ansiedad Estado']).toBeLessThanOrEqual(60);
      expect(r.subscales!['Ansiedad Rasgo']).toBeGreaterThanOrEqual(20);
      expect(r.subscales!['Ansiedad Rasgo']).toBeLessThanOrEqual(60);
    }
  });

  it('marca protocolo incompleto cuando falta una respuesta', () => {
    const answers = make(2);
    (answers as any)[39] = 0; // ítem 40 sin responder
    const r = STAIC_SCORING.score(answers);
    expect(r.details['incomplete']).toBeTrue();
    expect(r.details['missing']).toBe(1);
  });
});
