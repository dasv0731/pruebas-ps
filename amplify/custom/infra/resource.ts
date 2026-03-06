import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export function createInfrastructure(scope: Construct) {
  // VPC
  const vpc = new ec2.Vpc(scope, 'PeritoVPC', {
    maxAzs: 2,
    natGateways: 0,
  });

  // S3 bucket
  const bucket = new s3.Bucket(scope, 'PeritoBucket', {
    versioned: true,
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    cors: [
      {
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      },
    ],
  });

  // Colas SQS
  const transcriptionQueue = new sqs.Queue(scope, 'TranscriptionQueue', {
    visibilityTimeout: Duration.seconds(900),
  });

  const informeQueue = new sqs.Queue(scope, 'InformeQueue', {
    visibilityTimeout: Duration.seconds(900),
  });

  return { vpc, bucket, transcriptionQueue, informeQueue };
}