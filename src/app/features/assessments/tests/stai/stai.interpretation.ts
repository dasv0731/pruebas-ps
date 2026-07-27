import { InterpretationConfig, ScoringResult, AIInput } from '../../models/test.interfaces';
import { staiLookup, staiAgeGroup, StaiNorm, Sex } from './stai.baremos';

/**
 * Interpretación del STAI basada en BAREMOS (Tabla 9, centil/decatipo por
 * sexo·edad), no en cortes sobre la PD cruda. El manual NO publica puntos de
 * corte clínicos, por lo que NO se emite ninguna categoría diagnóstica: los
 * hallazgos describen la POSICIÓN NORMATIVA del sujeto respecto a su grupo
 * (sexo·edad), que es lo que el manual sí respalda (§5). Los antiguos cortes
 * 15/30/45 sobre la PD 0-60 y la diferencia fija de 15 puntos entre escalas
 * eran valores inventados y se han suprimido.
 */

export interface StaiNormedScale {
  pd: number;
  centil: number | null;
  decatipo: number | null;
}

export interface StaiNormedResult {
  estado: StaiNormedScale;
  rasgo: StaiNormedScale;
  baremoAplicado: boolean;
  grupoBaremo: string | null;
  avisoBaremo: string | null;
}

/** Descriptor normativo por decatipo (1-10; media 5,50). No es un corte clínico. */
function nivelNormativo(decatipo: number | null): string {
  if (decatipo == null) return 'sin baremo (falta sexo o edad)';
  if (decatipo <= 3) return 'baja respecto a la norma';
  if (decatipo <= 7) return 'media respecto a la norma';
  return 'alta respecto a la norma';
}

export function staiNormedScores(
  estadoPd: number,
  rasgoPd: number,
  sex?: Sex | null,
  ageYears?: number | null,
): StaiNormedResult {
  const ageGroup = ageYears != null && !Number.isNaN(ageYears)
    ? staiAgeGroup(ageYears)
    : null;
  const canBaremar = !!sex && ageGroup !== null;
  let estadoNorm: StaiNorm | null = null;
  let rasgoNorm: StaiNorm | null = null;
  let grupo: string | null = null;

  if (canBaremar) {
    grupo = `${ageGroup === 'ADOL' ? 'Adolescente (16-19)' : 'Adulto (≥20)'} · ${sex === 'MALE' ? 'Varón' : 'Mujer'}`;
    estadoNorm = staiLookup(estadoPd, { ageGroup: ageGroup!, sex: sex as Sex, scale: 'estado' });
    rasgoNorm = staiLookup(rasgoPd, { ageGroup: ageGroup!, sex: sex as Sex, scale: 'rasgo' });
  }

  return {
    estado: { pd: estadoPd, centil: estadoNorm?.centil ?? null, decatipo: estadoNorm?.decatipo ?? null },
    rasgo: { pd: rasgoPd, centil: rasgoNorm?.centil ?? null, decatipo: rasgoNorm?.decatipo ?? null },
    baremoAplicado: canBaremar && !!estadoNorm && !!rasgoNorm,
    grupoBaremo: grupo,
    avisoBaremo: canBaremar
      ? null
      : ageYears != null && ageYears < 16
        ? 'El STAI no se barema para menores de 16 años. Se informa solo la puntuación directa; use STAIC u otro instrumento infantil adecuado.'
        : 'No se registró sexo y/o edad del sujeto: no puede aplicarse el baremo (Tabla 9). Se informa solo la puntuación directa.',
  };
}

/** AI input enriquecido con baremo para el componente de resultados. */
export function buildStaiAIInput(
  result: ScoringResult,
  sex?: Sex | null,
  ageYears?: number | null,
): Record<string, any> {
  const estadoPd = result.subscales?.['Ansiedad Estado'] ?? 0;
  const rasgoPd = result.subscales?.['Ansiedad Rasgo'] ?? 0;
  const normed = staiNormedScores(estadoPd, rasgoPd, sex, ageYears);

  const findings: string[] = [];
  if (normed.baremoAplicado) {
    findings.push(`Ansiedad Estado (A/E): ${nivelNormativo(normed.estado.decatipo)} (centil ${normed.estado.centil}, decatipo ${normed.estado.decatipo}).`);
    findings.push(`Ansiedad Rasgo (A/R): ${nivelNormativo(normed.rasgo.decatipo)} (centil ${normed.rasgo.centil}, decatipo ${normed.rasgo.decatipo}).`);
  } else if (normed.avisoBaremo) {
    findings.push(normed.avisoBaremo);
  }

  return {
    testName: 'STAI - Inventario de Ansiedad Estado-Rasgo',
    testDescription: 'Ansiedad como estado transitorio (A/E) y como rasgo estable (A/R)',
    grupoBaremo: normed.grupoBaremo,
    scores: {
      'A/E puntuación directa (0-60)': normed.estado.pd,
      'A/E centil': normed.estado.centil,
      'A/E decatipo': normed.estado.decatipo,
      'A/R puntuación directa (0-60)': normed.rasgo.pd,
      'A/R centil': normed.rasgo.centil,
      'A/R decatipo': normed.rasgo.decatipo,
    },
    clinicalFindings: findings,
    baremoAplicado: normed.baremoAplicado,
    context: 'Evaluación pericial judicial',
  };
}

export const STAI_INTERPRETATION: InterpretationConfig = {
  clinicalRules: [],
  maxTokens: 500,
  systemPrompt: `Eres un psicólogo clínico forense. Genera una interpretación clínica CONCISA del STAI para un informe pericial judicial. Máximo 250 palabras. Escribe en español.

REGLAS:
- Usa solo los datos proporcionados, no inventes.
- Las puntuaciones se han baremado por sexo y edad (Tabla 9 del manual TEA): centil y decatipo (media 5,50; Dt 2). A mayor centil/decatipo, mayor ansiedad respecto a la norma del grupo.
- El manual NO define puntos de corte clínicos ni categorías "normal/patológico": interpreta de forma NORMATIVA (posición relativa a la norma), no diagnóstica. No inventes umbrales.
- Comenta el nivel de Ansiedad Estado (A/E, situacional) y Ansiedad Rasgo (A/R, estable) y su relación de forma cualitativa (un A/E alto con A/R normal sugiere reacción a la situación; A/R alto sugiere rasgo ansioso).
- Si 'baremoAplicado' es false, indica que no pudo aplicarse el baremo (falta sexo/edad) y limita la lectura a la puntuación directa.
- Concluye con la relevancia para el contexto pericial.
- NO uses encabezados ni listas con viñetas. Escribe en párrafos narrativos.`,

  // Ruta genérica sin sexo/edad: informa solo PD (sin baremo). El componente de
  // resultados usa buildStaiAIInput(result, sex, ageYears) para baremar.
  buildAIInput: (result: ScoringResult): AIInput => buildStaiAIInput(result) as unknown as AIInput,
};
