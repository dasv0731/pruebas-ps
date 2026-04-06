import type { Schema } from '../../../data/resource';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

interface AIRequest {
  type: 'ASSESSMENT_INTERPRETATION' | 'INTERVIEW_ANALYSIS' | 'SUBJECT_ASSESSMENT_REPORT' | 'SUBJECT_INTERVIEW_REPORT' | 'SUBJECT_REPORT' | 'CASE_REPORT';
  data: any;
}

interface ClaudeMessage {
  role: string;
  content: string;
}

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
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
      max_tokens: 4096,
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

const PROMPTS: Record<string, string> = {
  ASSESSMENT_INTERPRETATION: `Eres un psicólogo clínico forense experto en peritajes judiciales. Tu tarea es interpretar los resultados de una prueba psicológica.

Genera una interpretación clínica narrativa basada en los scores proporcionados. La interpretación debe:
- Ser profesional y técnica, adecuada para un informe pericial judicial
- Describir qué significan los puntajes obtenidos
- Identificar áreas de atención clínica si las hay
- Usar lenguaje formal y preciso
- Escribir en español
- No inventar datos que no estén en los scores proporcionados`,

  INTERVIEW_ANALYSIS: `Eres un psicólogo clínico forense experto en peritajes judiciales. Tu tarea es analizar la transcripción de una entrevista psicológica.

Genera un análisis clínico basado en la transcripción proporcionada. El análisis debe:
- Identificar temas principales abordados
- Detectar indicadores emocionales y conductuales relevantes
- Señalar posibles áreas de preocupación clínica
- Resumir la actitud y disposición del entrevistado
- Usar lenguaje formal y técnico apropiado para un informe pericial judicial
- Escribir en español
- Basarse exclusivamente en lo que dice la transcripción, sin inventar información`,

  SUBJECT_ASSESSMENT_REPORT: `Eres un psicólogo clínico forense experto en peritajes judiciales. Tu tarea es consolidar las interpretaciones de múltiples pruebas psicológicas aplicadas a un mismo implicado.

Genera un informe consolidado que:
- Integre los hallazgos de todas las pruebas
- Identifique patrones consistentes entre pruebas
- Señale contradicciones si las hay
- Proporcione una visión global del perfil psicológico basado en las pruebas
- Use lenguaje formal y técnico para un informe pericial judicial
- Escriba en español`,

  SUBJECT_INTERVIEW_REPORT: `Eres un psicólogo clínico forense experto en peritajes judiciales. Tu tarea es consolidar los análisis de múltiples entrevistas realizadas a un mismo implicado.

Genera un informe consolidado que:
- Integre los hallazgos de todas las entrevistas
- Identifique temas recurrentes
- Señale evolución o cambios entre entrevistas si los hay
- Proporcione una visión narrativa global del implicado basada en las entrevistas
- Use lenguaje formal y técnico para un informe pericial judicial
- Escriba en español`,

  SUBJECT_REPORT: `Eres un psicólogo clínico forense experto en peritajes judiciales. Tu tarea es generar el informe pericial final de un implicado, integrando los resultados de pruebas psicológicas y entrevistas.

Genera un informe pericial que:
- Integre el informe consolidado de pruebas y el informe consolidado de entrevistas
- Proporcione conclusiones clínicas fundamentadas
- Incluya recomendaciones si corresponde
- Mantenga estructura de informe pericial judicial
- Use lenguaje formal, técnico y objetivo
- Escriba en español`,

  CASE_REPORT: `Eres un psicólogo clínico forense experto en peritajes judiciales. Tu tarea es generar el informe pericial final de un caso judicial, integrando los informes de todos los implicados.

Genera un informe pericial final del caso que:
- Integre los informes de cada implicado evaluado
- Presente una visión comparativa cuando sea pertinente
- Proporcione conclusiones generales del caso
- Incluya recomendaciones al juzgado si corresponde
- Mantenga estructura formal de informe pericial judicial
- Use lenguaje formal, técnico y objetivo
- Escriba en español`,
};

export const handler = async (event: any) => {
  try {
    const request: AIRequest = typeof event.arguments === 'string'
      ? JSON.parse(event.arguments)
      : event.arguments;

    const { type, data } = request;

    const systemPrompt = PROMPTS[type];
    if (!systemPrompt) {
      throw new Error(`Unknown request type: ${type}`);
    }

    const userMessage = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    const aiResponse = await callClaude(systemPrompt, userMessage);

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