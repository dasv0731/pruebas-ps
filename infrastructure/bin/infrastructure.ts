#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from '../lib/infrastructure-stack';

const app = new cdk.App();
new InfrastructureStack(app, 'PeritoDBStack', {
  env: {
    account: '608051150109',
    region: 'us-east-1',
  },
});
