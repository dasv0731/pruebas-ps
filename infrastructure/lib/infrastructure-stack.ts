import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // VPC dedicada para la base de datos
    const vpc = new ec2.Vpc(this, 'PeritoDBVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // Security group para Aurora
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'PeritoDBSecurityGroup', {
      vpc,
      description: 'Security group for Perito Aurora cluster',
      allowAllOutbound: true,
    });

    dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from within VPC'
    );

    // Aurora Serverless v2 PostgreSQL
    const dbCluster = new rds.DatabaseCluster(this, 'PeritoDBCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_10,
      }),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 4,
      writer: rds.ClusterInstance.serverlessV2('writer'),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      defaultDatabaseName: 'peritopsicologico',
      enableDataApi: true,
      removalPolicy: RemovalPolicy.SNAPSHOT,
    });

    // Outputs para usar en el resto del sistema
    new CfnOutput(this, 'DBClusterArn', {
      value: dbCluster.clusterArn,
      exportName: 'PeritoDBClusterArn',
    });

    new CfnOutput(this, 'DBSecretArn', {
      value: dbCluster.secret!.secretArn,
      exportName: 'PeritoDBSecretArn',
    });

    new CfnOutput(this, 'DBClusterEndpoint', {
      value: dbCluster.clusterEndpoint.hostname,
      exportName: 'PeritoDBClusterEndpoint',
    });

    new CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      exportName: 'PeritoVpcId',
    });
  }
}