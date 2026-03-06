import { defineFunction } from '@aws-amplify/backend';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

export const casosFunction = defineFunction({
  name: 'casos',
  entry: '../../../backend/casos/src/index.ts',
  environment: {
    DB_CLUSTER_ARN: 'arn:aws:rds:us-east-1:608051150109:cluster:peritodbstack-peritodbcluster58582434-mav3w4il5mkr',
    DB_SECRET_ARN: 'arn:aws:secretsmanager:us-east-1:608051150109:secret:PeritoDBClusterSecret092094-7HrPtcFzz6xH-1xoPIW',
  },
  runtime: 20,
  timeoutSeconds: 30,
});