import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { aiGenerate } from './functions/ai-generate/resource';

defineBackend({
  auth,
  data,
  aiGenerate,
});