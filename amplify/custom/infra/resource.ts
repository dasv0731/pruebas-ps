import { Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export function createInfrastructure(scope: Construct, functions?: { casos?: lambda.IFunction }) {
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

  // API Gateway HTTP API
  const api = new apigwv2.HttpApi(scope, 'PeritoApi', {
    apiName: 'perito-psicologico-api',
    corsPreflight: {
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: [
        apigwv2.CorsHttpMethod.GET,
        apigwv2.CorsHttpMethod.POST,
        apigwv2.CorsHttpMethod.PUT,
        apigwv2.CorsHttpMethod.DELETE,
        apigwv2.CorsHttpMethod.OPTIONS,
      ],
      allowOrigins: ['*'],
    },
  });

  // Rutas de casos si la función existe
  if (functions?.casos) {
    const casosIntegration = new integrations.HttpLambdaIntegration(
      'CasosIntegration',
      functions.casos
    );

    api.addRoutes({ path: '/casos', methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], integration: casosIntegration });
    api.addRoutes({ path: '/casos/{id}', methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE], integration: casosIntegration });
  }

  new CfnOutput(scope, 'ApiUrl', {
    value: api.apiEndpoint,
    exportName: 'PeritoApiUrl',
  });

  return { vpc, bucket, transcriptionQueue, informeQueue, api };
}