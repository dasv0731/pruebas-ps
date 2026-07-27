import { defineFunction, secret } from '@aws-amplify/backend';

/**
 * Lambda mediadora del portal público del evaluado. TODAS las operaciones del
 * evaluado pasan por aquí y validan el código de acceso server-side, de modo que
 * la API key pública ya no da acceso directo a los modelos (no se pueden enumerar
 * datos de menores ni falsear respuestas/puntuaciones).
 */
export const evalPortal = defineFunction({
  name: 'eval-portal',
  entry: './src/handler.ts',
  timeoutSeconds: 60,
  memoryMB: 256,
  environment: {
    DEEPSEEK_API_KEY: secret('DEEPSEEK_API_KEY'),
    AI_BASE_URL: 'https://api.deepseek.com/anthropic',
    AI_MODEL: 'deepseek-v4-flash',
  },
});
