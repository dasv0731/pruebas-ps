import { STAI_SCORING } from './stai.scoring';

/**
 * Ítems invertidos del STAI (deben coincidir con stai.scoring.ts y la Lambda).
 * Estado: 1,2,5,8,10,11,15,16,19,20 (10 ítems)
 * Rasgo: 21,26,27,30,33,36,39 (7 ítems)
 */
function make(fill: number): number[] {
  return Array.from({ length: 40 }, () => fill);
}

describe('STAI_SCORING', () => {
  it('invierte los ítems positivos: todo opción 1 no da la suma cruda', () => {
    // Estado: 10 invertidos → 3 c/u (=30) + 10 directos → 0 (=0) = 30
    // Rasgo: 7 invertidos → 3 c/u (=21) + 13 directos → 0 (=0) = 21
    const r = STAI_SCORING.score(make(1));
    expect(r.subscales!['Ansiedad Estado']).toBe(30);
    expect(r.subscales!['Ansiedad Rasgo']).toBe(21);
    expect(r.totalScore).toBe(51);
  });

  it('todo opción 4 tampoco es la suma cruda (160)', () => {
    // Estado: 10 invertidos → 0 + 10 directos → 3 (=30) = 30
    // Rasgo: 7 invertidos → 0 + 13 directos → 3 (=39) = 39
    const r = STAI_SCORING.score(make(4));
    expect(r.subscales!['Ansiedad Estado']).toBe(30);
    expect(r.subscales!['Ansiedad Rasgo']).toBe(39);
    expect(r.totalScore).toBe(69);
  });

  it('máxima ansiedad = 120 (invertidos en 1, directos en 4)', () => {
    const answers = Array.from({ length: 40 }, (_, i) => {
      const item = i + 1;
      const inverted = [1, 2, 5, 8, 10, 11, 15, 16, 19, 20, 21, 26, 27, 30, 33, 36, 39].includes(item);
      return inverted ? 1 : 4;
    });
    const r = STAI_SCORING.score(answers);
    expect(r.subscales!['Ansiedad Estado']).toBe(60);
    expect(r.subscales!['Ansiedad Rasgo']).toBe(60);
    expect(r.totalScore).toBe(120);
    expect(r.maxScore).toBe(120);
    expect(r.percentage).toBe(100);
  });

  it('mínima ansiedad = 0 (invertidos en 4, directos en 1)', () => {
    const answers = Array.from({ length: 40 }, (_, i) => {
      const item = i + 1;
      const inverted = [1, 2, 5, 8, 10, 11, 15, 16, 19, 20, 21, 26, 27, 30, 33, 36, 39].includes(item);
      return inverted ? 4 : 1;
    });
    const r = STAI_SCORING.score(answers);
    expect(r.totalScore).toBe(0);
    expect(r.subscales!['Ansiedad Estado']).toBe(0);
    expect(r.subscales!['Ansiedad Rasgo']).toBe(0);
  });

  it('cada subescala queda dentro del rango 0-60', () => {
    for (const fill of [1, 2, 3, 4]) {
      const r = STAI_SCORING.score(make(fill));
      expect(r.subscales!['Ansiedad Estado']).toBeGreaterThanOrEqual(0);
      expect(r.subscales!['Ansiedad Estado']).toBeLessThanOrEqual(60);
      expect(r.subscales!['Ansiedad Rasgo']).toBeGreaterThanOrEqual(0);
      expect(r.subscales!['Ansiedad Rasgo']).toBeLessThanOrEqual(60);
    }
  });

  it('marca protocolo incompleto y no infla ítems invertidos sin responder', () => {
    const answers = make(1);
    (answers as any)[0] = 0; // ítem 1 (invertido) sin responder
    const r = STAI_SCORING.score(answers);
    expect(r.details['incomplete']).toBeTrue();
    expect(r.details['missing']).toBe(1);
    // El ítem 1 no responder aporta 0, no 3 (no infla la ansiedad)
    expect(r.subscales!['Ansiedad Estado']).toBe(27);
  });
});
