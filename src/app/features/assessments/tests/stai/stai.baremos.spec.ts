import { staiLookup, staiAgeGroup, StaiScale, Sex } from './stai.baremos';

/**
 * Verifica la transcripción de la Tabla 9 (STAI) y el lookup PD -> centil/decatipo.
 * Los valores esperados provienen de correccion/STAI-guia-de-correccion.md §4.
 */
describe('STAI baremos (Tabla 9)', () => {
  const g = (ageGroup: 'ADOL' | 'ADULT', sex: Sex, scale: StaiScale) => ({ ageGroup, sex, scale });

  it('clasifica edad en grupos: ≤19 adolescente, ≥20 adulto', () => {
    expect(staiAgeGroup(19)).toBe('ADOL');
    expect(staiAgeGroup(20)).toBe('ADULT');
    expect(staiAgeGroup(12)).toBe('ADOL');
    expect(staiAgeGroup(45)).toBe('ADULT');
  });

  it('convierte anclas exactas de la tabla (Adol. Varón, Estado)', () => {
    expect(staiLookup(45, g('ADOL', 'MALE', 'estado'))).toEqual({ centil: 97, decatipo: 9 });
    expect(staiLookup(20, g('ADOL', 'MALE', 'estado'))).toEqual({ centil: 50, decatipo: 6 });
    expect(staiLookup(10, g('ADOL', 'MALE', 'estado'))).toEqual({ centil: 10, decatipo: 3 });
  });

  it('trata los rangos extremos (centil 99 y 1)', () => {
    // Adol. Varón Estado: 99 = 47-60; 1 = 0-2
    expect(staiLookup(60, g('ADOL', 'MALE', 'estado'))).toEqual({ centil: 99, decatipo: 10 });
    expect(staiLookup(47, g('ADOL', 'MALE', 'estado'))).toEqual({ centil: 99, decatipo: 10 });
    expect(staiLookup(0, g('ADOL', 'MALE', 'estado'))).toEqual({ centil: 1, decatipo: 1 });
    expect(staiLookup(2, g('ADOL', 'MALE', 'estado'))).toEqual({ centil: 1, decatipo: 1 });
  });

  it('convierte anclas de otros grupos (Adulto Mujer, Rasgo y Estado)', () => {
    expect(staiLookup(24, g('ADULT', 'FEMALE', 'rasgo'))).toEqual({ centil: 50, decatipo: 6 });
    expect(staiLookup(47, g('ADULT', 'FEMALE', 'estado'))).toEqual({ centil: 95, decatipo: 9 });
  });

  it('interpola centiles en huecos entre anclas', () => {
    // Adol. Varón Estado: 43=c95, 44=c96 → 43.5 no existe; probamos 42 (hueco 38→43)
    const r = staiLookup(42, g('ADOL', 'MALE', 'estado'));
    expect(r).not.toBeNull();
    expect(r!.centil).toBeGreaterThan(90);
    expect(r!.centil).toBeLessThan(95);
  });

  it('es monótono: mayor PD nunca da menor centil, en los 8 grupos', () => {
    const combos: Array<['ADOL' | 'ADULT', Sex, StaiScale]> = [];
    for (const age of ['ADOL', 'ADULT'] as const)
      for (const sex of ['MALE', 'FEMALE'] as const)
        for (const scale of ['estado', 'rasgo'] as StaiScale[]) combos.push([age, sex, scale]);

    for (const [age, sex, scale] of combos) {
      let prev = -1;
      for (let pd = 0; pd <= 60; pd++) {
        const norm = staiLookup(pd, g(age, sex, scale));
        expect(norm).not.toBeNull();
        expect(norm!.centil).toBeGreaterThanOrEqual(prev);
        prev = norm!.centil;
      }
    }
  });
});
