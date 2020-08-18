import { IVpc, InstanceType, SecurityGroup } from "@aws-cdk/aws-ec2";
import { Cluster, EcsOptimizedAmi } from "@aws-cdk/aws-ecs";
import { Construct } from "@aws-cdk/core";
import { Role, ServicePrincipal, IManagedPolicy } from "@aws-cdk/aws-iam";
import { AutoScalingGroup, UpdateType } from "@aws-cdk/aws-autoscaling";

export interface SimpleClusterProps {
  readonly clusterName: string;
  readonly vpc: IVpc;
  readonly instanceTypeIdentifier?: string;
  readonly instanceManagedPolicies?: IManagedPolicy[];
}

export class SimpleCluster extends Construct {
  readonly cluster: Cluster;
  readonly securityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: SimpleClusterProps) {
    super(scope, id);

    const {
      clusterName,
      vpc,
      instanceTypeIdentifier = "t2.micro",
      instanceManagedPolicies: managedPolicies = [],
    } = props;

    const securityGroup = new SecurityGroup(this, "securityGroup", {
      securityGroupName: `${clusterName}-ecs-sg`,
      vpc,
    });

    const role = new Role(this, "instanceRole", {
      roleName: `${clusterName}ECSInstanceRole`,
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies,
    });

    const cluster = new Cluster(this, id, {
      clusterName,
      vpc,
    });

    const asg = new AutoScalingGroup(this, "autoScalingGroup", {
      vpc,
      machineImage: new EcsOptimizedAmi(),
      updateType: UpdateType.REPLACING_UPDATE,
      instanceType: new InstanceType(instanceTypeIdentifier),
      desiredCapacity: 1,
      autoScalingGroupName: `${clusterName}-default-asg`,
      securityGroup,
      role,
    });

    cluster.addAutoScalingGroup(asg);

    this.cluster = cluster;
    this.securityGroup = securityGroup;
  }
}
