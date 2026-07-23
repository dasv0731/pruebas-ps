import type { PAIFindings } from '../../../../core/services/pai-interpret.service';

/**
 * Interpretación IA del PAI (adultos). A diferencia de STAI/STAIC/CDI/TAMAI,
 * el PAI no encaja en el InterpretationConfig genérico (no pasa por
 * testLoader.score ni por un ScoringResult): los hallazgos ya vienen
 * calculados en cliente por PaiInterpretService.interpret() como PAIFindings.
 */
export interface PaiInterpretationConfig {
  systemPrompt: string;
  maxTokens: number;
}

export const PAI_INTERPRETATION: PaiInterpretationConfig = {
  maxTokens: 700,
  systemPrompt: `Eres un psicólogo clínico forense especializado en evaluación de adultos. Genera una interpretación clínica del PAI (Inventario de Evaluación de la Personalidad) para un informe pericial judicial. Máximo 350 palabras. Escribe en español.

REGLAS:
- Usa solo los datos proporcionados. No inventes contenido.
- Comenta PRIMERO la validez del perfil (escalas INC, INF, IMN, IMP). Si reportMode es 'NOT_INTERPRETABLE', LIMÍTATE a documentar la invalidez del protocolo y sus implicaciones periciales; no interpretes las escalas clínicas.
- Si el perfil es válido, interpreta las escalas clínicas con T>=70 y sus subescalas relevantes.
- Destaca de forma explícita y prioritaria los riesgos de suicidio (SUI) y agresión (AGR) cuando estén presentes, cualquiera que sea su nivel.
- Comenta las escalas de tratamiento e interpersonales con nivel elevado.
- Concluye con la relevancia para el contexto pericial.
- Escribe en párrafos narrativos, sin encabezados ni viñetas.`,
};

/**
 * Serializa los PAIFindings (ya calculados en cliente) para la interpretación
 * IA, incluyendo solo las escalas con nivel distinto de NORMAL para mantener
 * el payload compacto.
 */
export function buildPaiAIInputFromFindings(
  findings: PAIFindings,
  meta: { edad?: number; sexo?: string } = {}
): Record<string, any> {
  const nonNormal = (list: PAIFindings['validezResults']) =>
    list.filter((r) => r.level !== 'NORMAL').map((r) => ({ key: r.key, label: r.label, t: r.t, level: r.level }));

  return {
    testName: 'PAI - Inventario de Evaluación de la Personalidad',
    meta,
    reportMode: findings.reportMode,
    profileValidity: findings.profileValidity,
    validez: nonNormal(findings.validezResults),
    clinicas: nonNormal(findings.clinicasResults),
    subescalas: nonNormal(findings.subescalasResults),
    tratamiento: nonNormal(findings.tratamientoResults),
    interpersonales: nonNormal(findings.interpersonalesResults),
    suicideRisk: findings.suicideRisk,
    aggressionRisk: findings.aggressionRisk,
    clinicalFlags: findings.clinicalFlags,
    context: 'Evaluación pericial judicial - población adulta',
  };
}
