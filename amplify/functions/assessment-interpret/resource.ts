import { defineFunction, secret } from '@aws-amplify/backend';

export const assessmentInterpret = defineFunction({
  name: 'assessment-interpret',
  entry: './src/handler.ts',
  timeoutSeconds: 60,
  memoryMB: 256,
  environment: {
    DEEPSEEK_API_KEY: secret('DEEPSEEK_API_KEY'),
    AI_BASE_URL: 'https://api.deepseek.com/anthropic',
    AI_MODEL: 'deepseek-v4-flash',
  },
});
