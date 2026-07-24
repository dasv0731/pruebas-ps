import { InterpretationConfig, ScoringResult, AIInput } from '../../models/test.interfaces';
import { staicLookup, staicCourseGroupFromAge, StaicNorm, Sex } from './staic.baremos';

/**
 * Interpretación del STAIC basada en BAREMOS (Tabla 7, percentil + puntuación S
 * por sexo·grupo de curso), no en cortes sobre la PD cruda. El manual NO publica
 * puntos de corte clínicos; NO se emite categoría diagnóstica. Los antiguos
 * cortes 33/46 (tercios del rango 20-60) eran valores inventados y se suprimen.
 *
 * ⚠️ Aviso importante sobre la corrección: la clave de los 10 elementos INVERSOS
 * de la escala A-E NO consta en el manual (viene impresa en el ejemplar
 * autocorregible de TEA). La lista usada en staic.scoring.ts está INFERIDA por
 * contenido y no verificada contra el material oficial; hasta confirmarla, la PD
 * de A-E (y su baremo) debe tomarse como PROVISIONAL para uso pericial.
 */

export interface StaicNormedScale {
  pd: number;
  percentil: number | null;
  s: number | null;
}

export interface StaicNormedResult {
  estado: StaicNormedScale;
  rasgo: StaicNormedScale;
  baremoAplicado: boolean;
  grupoBaremo: string | null;
  avisoBaremo: string | null;
}

/** Descriptor normativo por percentil. No es un corte clínico. */
function nivelNormativo(percentil: number | null): string {
  if (percentil == null) return 'sin baremo (falta sexo o curso/edad)';
  if (percentil <= 15) return 'baja respecto a la norma';
  if (percentil < 85) return 'media respecto a la norma';
  return 'alta respecto a la norma';
}

export function staicNormedScores(
  estadoPd: number,
  rasgoPd: number,
  sex?: Sex | null,
  ageYears?: number | null,
): StaicNormedResult {
  const canBaremar = !!sex && ageYears != null && !Number.isNaN(ageYears);
  let estadoNorm: StaicNorm | null = null;
  let rasgoNorm: StaicNorm | null = null;
  let grupo: string | null = null;

  if (canBaremar) {
    const courseGroup = staicCourseGroupFromAge(ageYears as number);
    grupo = `${courseGroup === 'G1' ? 'G1 (4.º-6.º Prim.)' : 'G2 (1.º ESO-1.º Bach.)'} · ${sex === 'MALE' ? 'Varón' : 'Mujer'}`;
    estadoNorm = staicLookup(estadoPd, { courseGroup, sex: sex as Sex, scale: 'estado' });
    rasgoNorm = staicLookup(rasgoPd, { courseGroup, sex: sex as Sex, scale: 'rasgo' });
  }

  return {
    estado: { pd: estadoPd, percentil: estadoNorm?.percentil ?? null, s: estadoNorm?.s ?? null },
    rasgo: { pd: rasgoPd, percentil: rasgoNorm?.percentil ?? null, s: rasgoNorm?.s ?? null },
    baremoAplicado: canBaremar && !!estadoNorm && !!rasgoNorm,
    grupoBaremo: grupo,
    avisoBaremo: canBaremar
      ? null
      : 'No se registró sexo y/o curso-edad del sujeto: no puede aplicarse el baremo (Tabla 7). Se informa solo la puntuación directa.',
  };
}

export function buildStaicAIInput(
  result: ScoringResult,
  sex?: Sex | null,
  ageYears?: number | null,
): Record<string, any> {
  const estadoPd = result.subscales?.['Ansiedad Estado'] ?? 0;
  const rasgoPd = result.subscales?.['Ansiedad Rasgo'] ?? 0;
  const normed = staicNormedScores(estadoPd, rasgoPd, sex, ageYears);

  const findings: string[] = [];
  if (normed.baremoAplicado) {
    findings.push(`Ansiedad Estado (A-E): ${nivelNormativo(normed.estado.percentil)} (percentil ${normed.estado.percentil}, S ${normed.estado.s}).`);
    findings.push(`Ansiedad Rasgo (A-R): ${nivelNormativo(normed.rasgo.percentil)} (percentil ${normed.rasgo.percentil}, S ${normed.rasgo.s}).`);
  } else if (normed.avisoBaremo) {
    findings.push(normed.avisoBaremo);
  }
  findings.push('Nota metodológica: la clave de elementos inversos de A-E no está verificada contra el ejemplar oficial de TEA; la PD de A-E es provisional.');

  return {
    testName: 'STAIC - Inventario de Ansiedad Estado-Rasgo para Niños',
    testDescription: 'Ansiedad estado (A-E) y rasgo (A-R) en niños/adolescentes',
    grupoBaremo: normed.grupoBaremo,
    scores: {
      'A-E puntuación directa (20-60)': normed.estado.pd,
      'A-E percentil': normed.estado.percentil,
      'A-E puntuación S': normed.estado.s,
      'A-R puntuación directa (20-60)': normed.rasgo.pd,
      'A-R percentil': normed.rasgo.percentil,
      'A-R puntuación S': normed.rasgo.s,
    },
    clinicalFindings: findings,
    baremoAplicado: normed.baremoAplicado,
    context: 'Evaluación pericial judicial - población infantil',
  };
}

export const STAIC_INTERPRETATION: InterpretationConfig = {
  clinicalRules: [],
  maxTokens: 500,
  systemPrompt: `Eres un psicólogo clínico forense especializado en población infantil. Genera una interpretación clínica CONCISA del STAIC para un informe pericial judicial. Máximo 250 palabras. Escribe en español.

REGLAS:
- Usa solo los datos proporcionados.
- Las puntuaciones se han baremado por sexo y grupo de curso (Tabla 7 del manual TEA): percentil (1-99) y puntuación S (media 50, Dt 20). A mayor percentil/S, mayor ansiedad respecto a la norma.
- El manual NO define puntos de corte clínicos: interpreta de forma NORMATIVA (posición relativa a la norma), no diagnóstica. No inventes umbrales.
- Comenta el nivel de Ansiedad Estado (A-E, situacional) y Ansiedad Rasgo (A-R, estable) y su relación de forma cualitativa.
- Si 'baremoAplicado' es false, indica que no pudo aplicarse el baremo (falta sexo/curso-edad) y limita la lectura a la puntuación directa.
- Si consta la nota sobre los elementos inversos de A-E, refléjala como limitación metodológica.
- Concluye con la relevancia para el contexto pericial.
- Escribe en párrafos narrativos, sin encabezados ni viñetas.`,

  // Ruta genérica sin sexo/edad: el componente usa buildStaicAIInput(result, sex, ageYears).
  buildAIInput: (result: ScoringResult): AIInput => buildStaicAIInput(result) as unknown as AIInput,
};
