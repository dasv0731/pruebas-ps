import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { createInfrastructure } from './custom/infra/resource';
import { casosFunction } from './functions/casos/resource';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  casosFunction,
});

// Permisos para que la Lambda acceda a Aurora Data API y Secrets Manager
backend.casosFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'rds-data:ExecuteStatement',
      'rds-data:BatchExecuteStatement',
      'rds-data:BeginTransaction',
      'rds-data:CommitTransaction',
      'rds-data:RollbackTransaction',
    ],
    resources: [
      'arn:aws:rds:us-east-1:608051150109:cluster:peritodbstack-peritodbcluster58582434-mav3w4il5mkr',
    ],
  })
);

backend.casosFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: [
      'arn:aws:secretsmanager:us-east-1:608051150109:secret:PeritoDBClusterSecret092094-7HrPtcFzz6xH-1xoPIW',
    ],
  })
);

const customStack = backend.createStack('PeritoInfraStack');
createInfrastructure(customStack, {
  casos: backend.casosFunction.resources.lambda,
}); 