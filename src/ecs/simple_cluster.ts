import { IVpc, InstanceType, SecurityGroup } from "@aws-cdk/aws-ec2";
import { Cluster, ClusterProps, EcsOptimizedAmi } from "@aws-cdk/aws-ecs";
import { Construct } from "@aws-cdk/core";
import { Role, ServicePrincipal, IManagedPolicy } from "@aws-cdk/aws-iam";
import { AutoScalingGroup, UpdateType } from "@aws-cdk/aws-autoscaling";

export interface SimpleClusterProps extends ClusterProps {
  readonly instanceTypeIdentifier?: string;
  readonly instanceManagedPolicies?: IManagedPolicy[];
}

export class SimpleCluster extends Cluster {
  readonly securityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: SimpleClusterProps) {
    super(scope, id, props);

    const {
      instanceTypeIdentifier = "t2.micro",
      instanceManagedPolicies: managedPolicies = [],
    } = props;

    const securityGroup = new SecurityGroup(this, "securityGroup", {
      securityGroupName: `${this.clusterName}-ecs-sg`,
      vpc: this.vpc,
    });

    const role = new Role(this, "instanceRole", {
      roleName: `${this.clusterName}ECSInstanceRole`,
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies,
    });

    const asg = new AutoScalingGroup(this, "autoScalingGroup", {
      vpc: this.vpc,
      machineImage: new EcsOptimizedAmi(),
      updateType: UpdateType.REPLACING_UPDATE,
      instanceType: new InstanceType(instanceTypeIdentifier),
      desiredCapacity: 1,
      autoScalingGroupName: `${this.clusterName}-default-asg`,
      securityGroup,
      role,
    });

    this.addAutoScalingGroup(asg);
    this.securityGroup = securityGroup;
  }
}
