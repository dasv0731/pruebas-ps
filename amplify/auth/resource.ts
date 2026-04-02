import { defineAuth } from '@aws-amplify/backend';

/**
 * Auth: login con email, sin auto-registro.
 * Los usuarios se crean manualmente en Cognito console.
 * El sub de Cognito se usa como tenantId (owner-based isolation).
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});