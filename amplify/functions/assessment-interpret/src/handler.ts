import type { SQSHandler } from 'aws-lambda';
import type { Schema } from '../../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { getAssessmentPrompt } from '../../ai-generate/src/assessment-prompts';

let client: ReturnType<typeof generateClient<Schema>> | null = null;

async function getClient() {
  if (client) return client;
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(process.env as any);
  Amplify.configure(resourceConfig, libraryOptions);
  client = generateClient<Schema>();
  return client;
}

type InterpretationJob = {
  interpretationId: string;
  shortName: string;
  inputSnapshot: Record<string, unknown>;
};

export const handler: SQSHandler = async (event) => {
  const dataClient = await getClient();
  for (const record of event.Records) {
    const job = JSON.parse(record.body) as InterpretationJob;
    const interpretation = await dataClient.models.AssessmentInterpretation.get({ id: job.interpretationId });
    if (!interpretation.data || interpretation.data.status === 'COMPLETED') continue;

    const prompt = getAssessmentPrompt(job.shortName);
    const response = await fetch(`${(process.env['AI_BASE_URL'] || 'https://api.deepseek.com/anthropic').replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env['DEEPSEEK_API_KEY'] || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env['AI_MODEL'] || 'deepseek-v4-flash',
        max_tokens: prompt.maxTokens,
        system: prompt.system,
        messages: [{ role: 'user', content: JSON.stringify(job.inputSnapshot) }],
      }),
    });
    if (!response.ok) throw new Error(`AI API error: ${response.status} - ${await response.text()}`);

    const payload: any = await response.json();
    const text = Array.isArray(payload?.content)
      ? payload.content.find((block: any) => block?.type === 'text' && typeof block?.text === 'string')?.text
      : payload?.content;
    if (typeof text !== 'string' || !text.trim()) throw new Error('La IA no devolvió contenido de texto');
    const parsed = JSON.parse(text.trim().replace(/^```json\s*|\s*```$/g, ''));
    if (!parsed?.narrative || typeof parsed.narrative !== 'string') {
      throw new Error('La IA no devolvió una narrativa estructurada');
    }

    const updated = await dataClient.models.AssessmentInterpretation.update({
      id: job.interpretationId,
      content: parsed.narrative.trim(),
      status: 'COMPLETED',
      aiModel: process.env['AI_MODEL'] || 'deepseek-v4-flash',
      generatedAt: new Date().toISOString(),
      promptId: prompt.id,
      promptVersion: prompt.version,
      structuredContent: JSON.stringify({
        narrative: parsed.narrative.trim(),
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
        limitations: Array.isArray(parsed.limitations) ? parsed.limitations : [],
        reviewFlags: Array.isArray(parsed.reviewFlags) ? parsed.reviewFlags : [],
      }),
    });
    if (updated.errors) throw new Error(updated.errors.map((error: any) => error.message).join(', '));
  }
};
