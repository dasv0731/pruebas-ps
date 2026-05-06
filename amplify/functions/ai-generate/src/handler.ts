import type { Schema } from '../../../data/resource';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

interface AIRequest {
  type: string;
  data: string;
  systemPrompt?: string;
  maxTokens?: number;
  extractionRequest?: string;
}

async function callClaude(systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
  const apiKey = process.env['CLAUDE_API_KEY'];
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
        { role: 'user', content: userMessage },
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

/**
 * Tope de seguridad de caracteres de input por tipo. NO es la longitud objetivo:
 * es solo un cinturón contra inputs accidentalmente enormes (pegado de PDFs,
 * loops, etc.). Por debajo de este tope, el input pasa intacto.
 *
 * Equivalencias aproximadas (español, ~4 chars por token):
 *   8 000 chars  ≈  2 000 tokens
 *  60 000 chars  ≈ 15 000 tokens
 * 200 000 chars  ≈ 50 000 tokens
 *
 * Sonnet 4 admite 200 000 tokens de contexto, así que hay margen suficiente.
 */
const INPUT_CHAR_LIMIT_BY_TYPE: Record<string, number> = {
  INTERVIEW_ANALYSIS: 200000,
};
const DEFAULT_INPUT_CHAR_LIMIT = 8000;

function clampInput(type: string, message: string): string {
  const limit = INPUT_CHAR_LIMIT_BY_TYPE[type] ?? DEFAULT_INPUT_CHAR_LIMIT;
  return message.length > limit ? message.substring(0, limit) : message;
}

function buildUserMessage(type: string, baseMessage: string, extractionRequest?: string): string {
  if (type === 'INTERVIEW_ANALYSIS') {
    const extraction = extractionRequest?.trim();
    // Aspectos a resaltar van primero: si la transcripción es larga y se trunca,
    // las instrucciones del perito se preservan.
    if (extraction) {
      return `ASPECTOS A RESALTAR (indicado por el perito):\n${extraction}\n\nTRANSCRIPCIÓN:\n${baseMessage}`;
    }
    return `TRANSCRIPCIÓN:\n${baseMessage}`;
  }
  return baseMessage;
}

// Prompts de fallback para tipos que no envían prompt personalizado
const FALLBACK_PROMPTS: Record<string, { system: string; maxTokens: number }> = {
  ASSESSMENT_INTERPRETATION: {
    system: 'Eres un psicólogo clínico forense. Genera una interpretación clínica concisa para un informe pericial judicial. Máximo 250 palabras. Español. Párrafos narrativos, sin viñetas.',
    maxTokens: 500,
  },
  INTERVIEW_ANALYSIS: {
    system: `Eres un psicólogo clínico forense especializado en peritajes judiciales. Analiza la transcripción de entrevista que se te proporciona y produce un análisis estructurado para informe pericial. Español, en tercera persona, registro forense formal.

Metodología obligatoria:

1. EXTRACCIÓN. Identifica únicamente información presente en la transcripción. No inventes datos, no rellenes con suposiciones plausibles. Si una sección no tiene información, indícalo explícitamente con "[No referido en la entrevista]".

2. REDACCIÓN. Redacta en prosa narrativa formal, sin viñetas. Distingue entre lo que el evaluado refiere literalmente y lo que se observa o se infiere clínicamente.

3. SEÑALIZACIÓN. Cuando hagas una inferencia clínica que vaya más allá del dato literal, márcala explícitamente con "[Inferencia clínica]" al final de la frase, para que el perito pueda revisar y validar antes de firmar.

4. PRIORIDAD DEL PERITO. Si bajo el encabezado "ASPECTOS A RESALTAR" se incluyen instrucciones específicas del perito, dales prioridad y desarrolla esos puntos con mayor profundidad sin descuidar el resto.

Estructura del análisis:
- Temas principales abordados.
- Indicadores emocionales y conductuales observados.
- Coherencia y consistencia del relato.
- Observaciones clínicas relevantes para el contexto pericial.

Máximo 450 palabras.`,
    maxTokens: 900,
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

    const { type, data, systemPrompt, maxTokens, extractionRequest } = request;

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

    const baseMessage = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const userMessage = clampInput(type, buildUserMessage(type, baseMessage, extractionRequest));
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