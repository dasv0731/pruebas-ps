import type { Schema } from '../../../data/resource';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

interface AIRequest {
  type: string;
  data: string;
  systemPrompt?: string;
  maxTokens?: number;
}

async function callClaude(systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY not configured');
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage.substring(0, 8000) },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result.content[0].text;
}

// Prompts de fallback para tipos que no envían prompt personalizado
const FALLBACK_PROMPTS: Record<string, { system: string; maxTokens: number }> = {
  ASSESSMENT_INTERPRETATION: {
    system: 'Eres un psicólogo clínico forense. Genera una interpretación clínica concisa para un informe pericial judicial. Máximo 250 palabras. Español. Párrafos narrativos, sin viñetas.',
    maxTokens: 500,
  },
  INTERVIEW_ANALYSIS: {
    system: `Eres un psicólogo clínico forense. Analiza esta transcripción de entrevista para un informe pericial judicial. Máximo 300 palabras. Español.

Identifica: temas principales, indicadores emocionales/conductuales, coherencia del relato, observaciones clínicas relevantes. Párrafos narrativos, sin viñetas.`,
    maxTokens: 600,
  },
  SUBJECT_ASSESSMENT_REPORT: {
    system: `Eres un psicólogo clínico forense. Consolida las interpretaciones de múltiples pruebas psicológicas en un informe integrado. Máximo 400 palabras. Español.

Integra hallazgos, identifica patrones consistentes, señala contradicciones si las hay. Concluye con perfil psicológico global. Párrafos narrativos, sin viñetas.`,
    maxTokens: 800,
  },
  SUBJECT_INTERVIEW_REPORT: {
    system: `Eres un psicólogo clínico forense. Consolida los análisis de múltiples entrevistas en un informe integrado. Máximo 300 palabras. Español.

Integra hallazgos, identifica temas recurrentes, señala evolución entre entrevistas. Párrafos narrativos, sin viñetas.`,
    maxTokens: 600,
  },
  SUBJECT_REPORT: {
    system: `Eres un psicólogo clínico forense. Genera el informe pericial final de un implicado integrando pruebas y entrevistas. Máximo 500 palabras. Español.

Estructura: contexto de evaluación, resultados de pruebas (resumen), resultados de entrevistas (resumen), integración clínica, conclusiones, recomendaciones. Párrafos narrativos.`,
    maxTokens: 1000,
  },
  CASE_REPORT: {
    system: `Eres un psicólogo clínico forense. Genera el informe pericial final del caso judicial. Máximo 600 palabras. Español.

Estructura: datos del caso, síntesis por implicado (breve), análisis relacional entre implicados, conclusiones generales, recomendaciones al juzgado. Párrafos narrativos.`,
    maxTokens: 1200,
  },
};

export const handler = async (event: any) => {
  try {
    const request: AIRequest = typeof event.arguments === 'string'
      ? JSON.parse(event.arguments)
      : event.arguments;

    const { type, data, systemPrompt, maxTokens } = request;

    // Usar prompt personalizado si viene, sino usar fallback
    let finalSystemPrompt: string;
    let finalMaxTokens: number;

    if (systemPrompt) {
      finalSystemPrompt = systemPrompt;
      finalMaxTokens = maxTokens || 500;
    } else {
      const fallback = FALLBACK_PROMPTS[type];
      if (!fallback) {
        throw new Error(`Unknown request type: ${type}`);
      }
      finalSystemPrompt = fallback.system;
      finalMaxTokens = fallback.maxTokens;
    }

    const userMessage = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const aiResponse = await callClaude(finalSystemPrompt, userMessage, finalMaxTokens);

    return {
      success: true,
      type,
      content: aiResponse,
      model: 'claude-sonnet-4-20250514',
      generatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
};