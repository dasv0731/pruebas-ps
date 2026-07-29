import { defineBackend } from '@aws-amplify/backend';
import { Duration } from 'aws-cdk-lib';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { aiGenerate } from './functions/ai-generate/resource';
import { cdiScore } from './functions/cdi-score/resource';
import { staiScore } from './functions/stai-score/resource';
import { cuidaInterpret } from './functions/cuida-interpret/resource';
import { evalPortal } from './functions/eval-portal/resource';
import { assessmentInterpret } from './functions/assessment-interpret/resource';

const backend = defineBackend({
  auth,
  data,
  aiGenerate,
  cdiScore,
  staiScore,
  cuidaInterpret,
  evalPortal,
  assessmentInterpret,
});

const asyncProcessing = backend.createStack('async-processing');
const interpretationQueue = new Queue(asyncProcessing, 'AssessmentInterpretationQueue', {
  visibilityTimeout: Duration.seconds(90),
  retentionPeriod: Duration.days(7),
});

interpretationQueue.grantSendMessages(backend.evalPortal.resources.lambda);
interpretationQueue.grantConsumeMessages(backend.assessmentInterpret.resources.lambda);
backend.evalPortal.resources.lambda.addEnvironment('INTERPRETATION_QUEUE_URL', interpretationQueue.queueUrl);
backend.assessmentInterpret.resources.lambda.addEventSource(new SqsEventSource(interpretationQueue, {
  batchSize: 1,
}));
