import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';

export class ECSExecViaCDKStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const mainVpc = new ec2.Vpc(this, 'ECSVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 99
    });

    const ksmEncryptionKey = new kms.Key(this, 'ECSClusterKey', {
      enableKeyRotation: true,
    });

    const ecsCluster = new ecs.Cluster(this, 'SimpleCluster', {
      vpc: mainVpc,
      executeCommandConfiguration: { kmsKey: ksmEncryptionKey }
    });

    const ecsTaskDefinition = new ecs.FargateTaskDefinition(this, 'SimpleTask', {
      cpu: 256,
      memoryLimitMiB: 512
    });

    ecsTaskDefinition.addContainer('SimpleContainer', {
      image: ecs.ContainerImage.fromRegistry('httpd:2.4'),
      portMappings: [{ containerPort: 80 }],
      logging: new ecs.AwsLogDriver({ streamPrefix: 'SimpleLogging', mode: ecs.AwsLogDriverMode.NON_BLOCKING }),
    });

    ecsTaskDefinition.addToTaskRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssmmessages:CreateControlChannel', 'ssmmessages:CreateDataChannel', 'ssmmessages:OpenControlChannel', 'ssmmessages:OpenDataChannel'],
        resources: ['*']
      }),
    );

    ecsTaskDefinition.addToTaskRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['kms:Decrypt'],
        resources: [ksmEncryptionKey.keyArn]
      }),
    );

    const ecsService = new ecs.FargateService(this, 'SimpleService', {
      cluster: ecsCluster,
      taskDefinition: ecsTaskDefinition,
      desiredCount: 1,
      assignPublicIp: false,
      enableExecuteCommand: true,  // Allows SSM to connect to the container, for the ECS Exec Access feature https://aws.amazon.com/blogs/containers/new-using-amazon-ecs-exec-access-your-containers-fargate-ec2/
    });

    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'SimpleLoadBalancer', {
      vpc: mainVpc,
      internetFacing: true,
    });

    const listener = loadBalancer.addListener('SimpleListener', { port: 80 });

    ecsService.registerLoadBalancerTargets({
      containerName: 'SimpleContainer',
      containerPort: 80,
      newTargetGroupId: 'SimpleTargetGroup',
      listener: ecs.ListenerConfig.applicationListener(listener, {
        protocol: elbv2.ApplicationProtocol.HTTP
      })
    });
  }
}
