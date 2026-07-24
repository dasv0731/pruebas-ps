import { staicLookup, staicCourseGroupFromAge, StaicScale, StaicCourseGroup, Sex } from './staic.baremos';

/**
 * Verifica la transcripción de la Tabla 7 (STAIC) y el lookup PD -> percentil/S.
 * Valores esperados de correccion/STAIC-guia-de-correccion.md §4.
 */
describe('STAIC baremos (Tabla 7)', () => {
  const g = (courseGroup: StaicCourseGroup, sex: Sex, scale: StaicScale) => ({ courseGroup, sex, scale });

  it('deriva el grupo de curso desde la edad (≤11 G1, ≥12 G2)', () => {
    expect(staicCourseGroupFromAge(11)).toBe('G1');
    expect(staicCourseGroupFromAge(12)).toBe('G2');
    expect(staicCourseGroupFromAge(9)).toBe('G1');
    expect(staicCourseGroupFromAge(16)).toBe('G2');
  });

  it('convierte anclas exactas de la tabla', () => {
    expect(staicLookup(46, g('G1', 'MALE', 'estado'))).toEqual({ percentil: 97, s: 87 });
    expect(staicLookup(33, g('G1', 'MALE', 'rasgo'))).toEqual({ percentil: 50, s: 50 });
    expect(staicLookup(37, g('G2', 'FEMALE', 'rasgo'))).toEqual({ percentil: 50, s: 50 });
  });

  it('trata los rangos extremos (percentil 99 y mínimos)', () => {
    expect(staicLookup(60, g('G2', 'FEMALE', 'rasgo'))).toEqual({ percentil: 99, s: 97 });
    expect(staicLookup(20, g('G1', 'FEMALE', 'estado'))).toEqual({ percentil: 1, s: 3 });
  });

  it('es monótono: mayor PD nunca da menor percentil, en los 8 grupos', () => {
    const combos: Array<[StaicCourseGroup, Sex, StaicScale]> = [];
    for (const cg of ['G1', 'G2'] as StaicCourseGroup[])
      for (const sex of ['MALE', 'FEMALE'] as const)
        for (const scale of ['estado', 'rasgo'] as StaicScale[]) combos.push([cg, sex, scale]);

    for (const [cg, sex, scale] of combos) {
      let prev = -1;
      for (let pd = 20; pd <= 60; pd++) {
        const norm = staicLookup(pd, g(cg, sex, scale));
        expect(norm).not.toBeNull();
        expect(norm!.percentil).toBeGreaterThanOrEqual(prev);
        prev = norm!.percentil;
      }
    }
  });
});
