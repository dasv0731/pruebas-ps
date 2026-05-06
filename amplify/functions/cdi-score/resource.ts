import { defineFunction } from '@aws-amplify/backend';

export const cdiScore = defineFunction({
  name: 'cdi-score',
  entry: './src/handler.ts',
  timeoutSeconds: 30,
  memoryMB: 256,
});