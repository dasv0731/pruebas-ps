import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { aiGenerate } from './functions/ai-generate/resource';
import { cdiScore } from './functions/cdi-score/resource';
import { staiScore } from './functions/stai-score/resource';
import { cuidaInterpret } from './functions/cuida-interpret/resource';

const backend = defineBackend({
  auth,
  data,
  aiGenerate,
  cdiScore,
  staiScore,
  cuidaInterpret,
});