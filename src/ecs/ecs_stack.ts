import { App, Duration } from "@aws-cdk/core";
import { IVpc, InstanceType, SecurityGroup, Port } from "@aws-cdk/aws-ec2";
import { Cluster } from "@aws-cdk/aws-ecs";
import {
  ApplicationListener,
  ApplicationLoadBalancer,
  ContentType,
} from "@aws-cdk/aws-elasticloadbalancingv2";
import { HostedZone, ARecord, RecordTarget } from "@aws-cdk/aws-route53";
import { LoadBalancerTarget } from "@aws-cdk/aws-route53-targets";
import {
  Certificate,
  DnsValidatedCertificate,
} from "@aws-cdk/aws-certificatemanager";
import BaseStack, { BaseStackProps } from "../base_stacks/base_stack";

export interface EcsStackProps extends BaseStackProps {
  readonly baseDomain: string;
  readonly vpc: IVpc;
  readonly description?: string;
  readonly instanceTypeIdentifier?: string;
  readonly certificateArn?: string;
}

export class EcsStack extends BaseStack {
  cluster: Cluster;
  httpListener: ApplicationListener;
  httpsListener: ApplicationListener;
  baseDomain: string;

  constructor(scope: App, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const {
      vpc,
      baseDomain,
      certificateArn,
      instanceTypeIdentifier = "t2.micro",
    } = props;
    this.baseDomain = baseDomain;

    const securityGroup = new SecurityGroup(this, "securityGroup", {
      securityGroupName: this.conventions.eqn(),
      vpc,
    });

    const cluster = new Cluster(this, "ecs", {
      clusterName: this.conventions.eqn(),
      vpc,
    });

    cluster.addCapacity("DefaultAutoScalingGroupCapacity", {
      instanceType: new InstanceType(instanceTypeIdentifier),
      desiredCapacity: 1,
    });

    cluster.connections.allowTo(
      securityGroup,
      Port.allTcp(),
      "Default VPC security group"
    );

    this.cluster = cluster;

    const hostedZone = HostedZone.fromLookup(this, "servicesDomain", {
      domainName: baseDomain,
    });

    const lb = new ApplicationLoadBalancer(this, "lb", {
      vpc: vpc,
      http2Enabled: true,
      internetFacing: true,
      loadBalancerName: `${this.conventions.eqn()}-alb`,
    });

    this.httpListener = lb.addListener("httpListener", {
      port: 80,
    });

    let cert = null;
    if (certificateArn) {
      cert = Certificate.fromCertificateArn(this, "httpsCert", certificateArn);
    } else {
      cert = new DnsValidatedCertificate(this, "httpsCert", {
        domainName: `*.${baseDomain}`,
        hostedZone,
      });
    }

    this.httpsListener = lb.addListener("httpsListener", {
      port: 443,
      certificates: [cert],
    });

    [this.httpListener, this.httpsListener].forEach((l) => {
      // Add a default handler that just renders a 404
      l.addFixedResponse("Fallback handler", {
        contentType: ContentType.TEXT_PLAIN,
        messageBody: "Not Found",
        statusCode: "404",
      });
    });

    new ARecord(this, "wildcardDns", {
      zone: hostedZone,
      comment: "Wildcard record for services load balancer",
      recordName: "*",
      ttl: Duration.minutes(5),
      target: RecordTarget.fromAlias(new LoadBalancerTarget(lb)),
    });
  }
}
