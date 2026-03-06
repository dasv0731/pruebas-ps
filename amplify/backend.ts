import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { createInfrastructure } from './custom/infra/resource';

const backend = defineBackend({
  auth,
});

const customStack = backend.createStack('PeritoInfraStack');
createInfrastructure(customStack);