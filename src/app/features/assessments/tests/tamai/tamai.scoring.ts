import { TestScoring, ScoringResult } from '../../models/test.interfaces';

export const TAMAI_SCORING: TestScoring = {
  score(answers: number[]): ScoringResult {
    // SÍ = 1, NO = 2 (opción seleccionada)
    // Convertir a 1/0: opción 1 (SÍ) = 1, opción 2 (NO) = 0
    const binary: number[] = answers.map((a) => a === 1 ? 1 : 0);

    const personalItems = binary.slice(0, 22);
    const escolarItems = binary.slice(22, 42);
    const socialItems = binary.slice(42, 60);
    const satisfaccionItems = binary.slice(60, 77);
    const escolarPosItems = binary.slice(77, 88);
    const socialPosItems = binary.slice(88, 105);
    const familiarItems = binary.slice(105, 110);
    const hermanosItems = binary.slice(110, 115);
    const padreItems = binary.slice(115, 145);
    const madreItems = binary.slice(145, 175);

    const personalScore = personalItems.reduce((s, v) => s + v, 0);
    const escolarScore = escolarItems.reduce((s, v) => s + v, 0);
    const socialScore = socialItems.reduce((s, v) => s + v, 0);
    const satisfaccionScore = satisfaccionItems.reduce((s, v) => s + v, 0);
    const escolarPosScore = escolarPosItems.reduce((s, v) => s + v, 0);
    const socialPosScore = socialPosItems.reduce((s, v) => s + v, 0);
    const familiarScore = familiarItems.reduce((s, v) => s + v, 0);
    const hermanosScore = hermanosItems.reduce((s, v) => s + v, 0);
    const padreScore = padreItems.reduce((s, v) => s + v, 0);
    const madreScore = madreItems.reduce((s, v) => s + v, 0);

    const totalScore = binary.reduce((s, v) => s + v, 0);
    const maxScore = binary.length;

    return {
      totalScore,
      maxScore,
      percentage: Math.round((totalScore / maxScore) * 100),
      subscales: {
        'Adaptación Personal': personalScore,
        'Adaptación Escolar': escolarScore,
        'Adaptación Social': socialScore,
        'Satisfacción Personal': satisfaccionScore,
        'Adaptación Escolar (positiva)': escolarPosScore,
        'Adaptación Social (positiva)': socialPosScore,
        'Adaptación Familiar': familiarScore,
        'Relación con Hermanos': hermanosScore,
        'Relación con Padre': padreScore,
        'Relación con Madre': madreScore,
      },
      details: {
        personalScore,
        personalMax: 22,
        escolarScore,
        escolarMax: 20,
        socialScore,
        socialMax: 18,
        satisfaccionScore,
        satisfaccionMax: 17,
        escolarPosScore,
        escolarPosMax: 11,
        socialPosScore,
        socialPosMax: 17,
        familiarScore,
        familiarMax: 5,
        hermanosScore,
        hermanosMax: 5,
        padreScore,
        padreMax: 30,
        madreScore,
        madreMax: 30,
      },
    };
  },
};