import { defineFunction } from '@aws-amplify/backend';

export const staiScore = defineFunction({
  name: 'stai-score',
  entry: './src/handler.ts',
  timeoutSeconds: 30,
  memoryMB: 256,
});