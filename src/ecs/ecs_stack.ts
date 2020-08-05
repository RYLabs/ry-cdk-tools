import { App, Duration } from "@aws-cdk/core";
import { IVpc, InstanceType, SecurityGroup, Port } from "@aws-cdk/aws-ec2";
import { Cluster, EcsOptimizedAmi } from "@aws-cdk/aws-ecs";
import {
  IHostedZone,
  HostedZone,
  ARecord,
  RecordTarget,
} from "@aws-cdk/aws-route53";
import { LoadBalancerTarget } from "@aws-cdk/aws-route53-targets";
import {
  DnsValidatedCertificate,
  Certificate,
} from "@aws-cdk/aws-certificatemanager";
import { AutoScalingGroup, UpdateType } from "@aws-cdk/aws-autoscaling";
import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import BaseStack, { BaseStackProps } from "../base_stacks/base_stack";
import {
  SessionAccess,
  ssmManagedInstancePolicy,
} from "../constructs/session_access";
import { SimpleLoadBalancer } from "../constructs/simple_load_balancer";

export interface EcsStackProps extends BaseStackProps {
  readonly vpc: IVpc;
  readonly description?: string;
  readonly instanceTypeIdentifier?: string;
  readonly wildcardHttpsCertificateArn?: string;
  readonly wildcardDomain?: string;
}

export class EcsStack extends BaseStack {
  readonly cluster: Cluster;
  readonly wildcardDomain?: string;

  constructor(scope: App, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const {
      vpc,
      instanceTypeIdentifier = "t2.micro",
      wildcardHttpsCertificateArn,
      wildcardDomain,
    } = props;

    const securityGroup = new SecurityGroup(this, "securityGroup", {
      securityGroupName: `${this.conventions.eqn()}-ecs-sg`,
      vpc,
    });

    const role = new Role(this, "InstanceRole", {
      roleName: `${this.conventions.eqn("camel")}ECSInstanceRole`,
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [ssmManagedInstancePolicy()],
    });

    const cluster = new Cluster(this, "ecs", {
      clusterName: this.conventions.eqn(),
      vpc,
    });

    const asg = new AutoScalingGroup(this, "DefaultAutoScalingGroupCapacity", {
      vpc,
      machineImage: new EcsOptimizedAmi(),
      updateType: UpdateType.REPLACING_UPDATE,
      instanceType: new InstanceType(instanceTypeIdentifier),
      desiredCapacity: 1,
      autoScalingGroupName: `${this.conventions.eqn()}-default-asg`,
      securityGroup,
      role,
    });

    cluster.addAutoScalingGroup(asg);

    this.cluster = cluster;

    const httpsCertificates = [];

    let wildcardHostedZone: IHostedZone | undefined;

    if (wildcardDomain) {
      wildcardHostedZone = HostedZone.fromLookup(this, "servicesDomain", {
        domainName: wildcardDomain,
      });

      let wildcardCert = null;

      if (wildcardHttpsCertificateArn) {
        wildcardCert = Certificate.fromCertificateArn(
          this,
          "httpsCert",
          wildcardHttpsCertificateArn
        );
      } else {
        wildcardCert = new DnsValidatedCertificate(this, "httpsCert", {
          domainName: `*.${wildcardDomain}`,
          hostedZone: wildcardHostedZone,
        });
      }

      httpsCertificates.push(wildcardCert);
    }

    const loadBalancer = new SimpleLoadBalancer(this, "loadBalancer", {
      vpc,
      conventions: this.conventions,
      httpsCertificates,
    });

    loadBalancer.securityGroup.connections.allowTo(
      securityGroup,
      Port.allTcp()
    );

    if (wildcardHostedZone) {
      new ARecord(this, "wildcardDns", {
        zone: wildcardHostedZone,
        comment: "Wildcard record for services load balancer",
        recordName: "*",
        ttl: Duration.minutes(5),
        target: RecordTarget.fromAlias(
          new LoadBalancerTarget(loadBalancer.alb)
        ),
      });
    }

    new SessionAccess(this, "sessionAccess", {
      name: this.conventions.eqn("camel"),
      ec2InstanceTag: "aws:cloudformation:stack-name",
      ec2InstanceTagValue: this.stackName,
    });
  }
}
