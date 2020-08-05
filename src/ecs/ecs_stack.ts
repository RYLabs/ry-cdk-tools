import { App, Duration } from "@aws-cdk/core";
import { Cluster } from "@aws-cdk/aws-ecs";
import BaseStack, { BaseStackProps } from "../base_stacks/base_stack";
import { IVpc, InstanceType, SecurityGroup, Port } from "@aws-cdk/aws-ec2";
import {
  ApplicationListener,
  ApplicationLoadBalancer,
  ContentType,
} from "@aws-cdk/aws-elasticloadbalancingv2";
import { HostedZone, ARecord, RecordTarget } from "@aws-cdk/aws-route53";
import { LoadBalancerTarget } from "@aws-cdk/aws-route53-targets";
import { DnsValidatedCertificate } from "@aws-cdk/aws-certificatemanager";

export interface EcsStackProps extends BaseStackProps {
  readonly baseDomain: string;
  readonly vpc: IVpc;
  readonly ec2KeyName?: string;
  readonly description?: string;
  readonly instanceTypeIdentifier?: string;
}

export default class EcsStack extends BaseStack {
  cluster: Cluster;
  httpListener: ApplicationListener;
  httpsListener: ApplicationListener;
  baseDomain: string;

  constructor(scope: App, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const {
      vpc,
      baseDomain,
      ec2KeyName,
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
      keyName: ec2KeyName,
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
      loadBalancerName: `${this.conventions.eqn()}-lb`,
    });

    this.httpListener = lb.addListener("httpListener", {
      port: 80,
    });

    const cert = new DnsValidatedCertificate(this, "httpsCert", {
      domainName: `*.${baseDomain}`,
      hostedZone,
    });

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

    const dnsRecord = new ARecord(this, "wildcardDns", {
      zone: hostedZone,
      comment: "Wildcard record for services load balancer",
      recordName: "*",
      ttl: Duration.minutes(5),
      target: RecordTarget.fromAlias(new LoadBalancerTarget(lb)),
    });
  }
}
