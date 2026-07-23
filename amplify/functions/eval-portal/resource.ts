import { defineFunction } from '@aws-amplify/backend';

/**
 * Lambda mediadora del portal público del evaluado. TODAS las operaciones del
 * evaluado pasan por aquí y validan el código de acceso server-side, de modo que
 * la API key pública ya no da acceso directo a los modelos (no se pueden enumerar
 * datos de menores ni falsear respuestas/puntuaciones).
 */
export const evalPortal = defineFunction({
  name: 'eval-portal',
  entry: './src/handler.ts',
  timeoutSeconds: 30,
  memoryMB: 256,
});
