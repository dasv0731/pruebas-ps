import { defineFunction } from '@aws-amplify/backend';

export const cuidaInterpret = defineFunction({
  name: 'cuida-interpret',
  entry: './src/handler.ts',
  timeoutSeconds: 30,
  memoryMB: 256,
});
