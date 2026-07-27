import { defineFunction, secret } from '@aws-amplify/backend';

export const aiGenerate = defineFunction({
  name: 'ai-generate',
  entry: './src/handler.ts',
  timeoutSeconds: 60,
  memoryMB: 256,
  environment: {
    // DeepSeek expone un endpoint compatible con la API de Anthropic (Messages),
    // por lo que se reutiliza el mismo cliente sin SDK adicional.
    DEEPSEEK_API_KEY: secret('DEEPSEEK_API_KEY'),
    AI_BASE_URL: 'https://api.deepseek.com/anthropic',
    AI_MODEL: 'deepseek-v4-flash',
  },
});
