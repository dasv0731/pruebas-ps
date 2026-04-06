import { defineFunction, secret } from '@aws-amplify/backend';

export const aiGenerate = defineFunction({
  name: 'ai-generate',
  entry: './src/handler.ts',
  timeoutSeconds: 60,
  memoryMB: 256,
  environment: {
    CLAUDE_API_KEY: secret('CLAUDE_API_KEY'),
  },
});