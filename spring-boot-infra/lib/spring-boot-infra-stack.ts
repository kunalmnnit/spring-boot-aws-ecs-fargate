import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";

export class SpringBootInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const vpc = new ec2.Vpc(this, "MyVpc", {
      maxAzs: 2,
      natGateways: 1
    });
    const cluster = new ecs.Cluster(this, "MyCluster", {
      vpc: vpc
    });

    // Create a load-balanced Fargate service and make it public
    const App = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "MyFargateService", {
      cluster: cluster, // Required
      cpu: 256, // Default is 256
      desiredCount: 2, // Default is 1
      taskImageOptions: { image: ecs.ContainerImage.fromAsset("../spring-boot-application"), containerPort: 8080 },
      memoryLimitMiB: 512, // Default is 512
      publicLoadBalancer: true // Default is true
    });
    App.targetGroup.configureHealthCheck({
      port: 'traffic-port',
      path: '/actuator/health',
      interval: cdk.Duration.seconds(5),
      timeout: cdk.Duration.seconds(4),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
      healthyHttpCodes: "200,301,302"
    })
    const springbootAutoScaling = App.service.autoScaleTaskCount({
      maxCapacity: 4,
      minCapacity: 2
    })
    springbootAutoScaling.scaleOnCpuUtilization('cpu-autoscaling', {
      targetUtilizationPercent: 45,
      scaleInCooldown: cdk.Duration.seconds(30),
      scaleOutCooldown: cdk.Duration.seconds(30)
    })
  }
}
