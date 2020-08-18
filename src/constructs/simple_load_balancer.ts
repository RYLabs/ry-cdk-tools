import { Construct, Duration } from "@aws-cdk/core";
import { IVpc, SecurityGroup } from "@aws-cdk/aws-ec2";
import {
  ApplicationListener,
  ApplicationLoadBalancer,
  ContentType,
  IListenerCertificate,
} from "@aws-cdk/aws-elasticloadbalancingv2";
import { LoadBalancerTarget } from "@aws-cdk/aws-route53-targets";
import {
  IHostedZone,
  HostedZone,
  ARecord,
  RecordTarget,
} from "@aws-cdk/aws-route53";
import {
  DnsValidatedCertificate,
  Certificate,
} from "@aws-cdk/aws-certificatemanager";
import { Conventions } from "../core";

export interface SimpleLoadBalancerProps {
  readonly vpc: IVpc;
  readonly conventions: Conventions;
  readonly httpsCertificates?: IListenerCertificate[];
}

export interface WildcardDomainLoadBalancerProps
  extends SimpleLoadBalancerProps {
  readonly baseDomain: string;
  readonly certificateArn?: string;
}

export class SimpleLoadBalancer extends Construct {
  readonly alb: ApplicationLoadBalancer;
  readonly httpListener: ApplicationListener;
  readonly httpsListener: ApplicationListener;
  readonly securityGroup: SecurityGroup;

  static withWildcardDomain(
    scope: Construct,
    id: string,
    props: WildcardDomainLoadBalancerProps
  ) {
    const { baseDomain, certificateArn, httpsCertificates = [] } = props;

    let hostedZone: IHostedZone | undefined;

    hostedZone = HostedZone.fromLookup(scope, "hostedZone", {
      domainName: baseDomain,
    });

    if (certificateArn) {
      httpsCertificates.push(
        Certificate.fromCertificateArn(scope, "httpsCert", certificateArn)
      );
    } else {
      httpsCertificates.push(
        new DnsValidatedCertificate(scope, "httpsCert", {
          domainName: `*.${baseDomain}`,
          hostedZone,
        })
      );
    }

    const loadBalancer = new SimpleLoadBalancer(scope, id, {
      ...props,
      httpsCertificates,
    });

    new ARecord(scope, "wildcardDns", {
      zone: hostedZone,
      comment: "Wildcard record for services load balancer",
      recordName: "*",
      ttl: Duration.minutes(5),
      target: RecordTarget.fromAlias(new LoadBalancerTarget(loadBalancer.alb)),
    });

    return loadBalancer;
  }

  constructor(scope: Construct, id: string, props: SimpleLoadBalancerProps) {
    super(scope, id);

    const { vpc, httpsCertificates = [], conventions } = props;

    this.securityGroup = new SecurityGroup(this, "securityGroup", {
      securityGroupName: `${conventions.eqn()}-alb-sg`,
      allowAllOutbound: true,
      vpc,
    });

    this.alb = new ApplicationLoadBalancer(this, "loadBalancer", {
      vpc,
      http2Enabled: true,
      internetFacing: true,
      loadBalancerName: `${conventions.eqn()}-alb`,
      securityGroup: this.securityGroup,
    });

    const listeners: ApplicationListener[] = [];

    this.httpListener = this.alb.addListener("httpListener", {
      port: 80,
    });
    listeners.push(this.httpListener);

    if (httpsCertificates.length) {
      this.httpsListener = this.alb.addListener("httpsListener", {
        port: 443,
        certificates: httpsCertificates,
      });
      listeners.push(this.httpsListener);
    }

    listeners.forEach((l) => {
      // Add a default handler that just renders a 200
      l.addFixedResponse("Default Handler", {
        contentType: ContentType.TEXT_PLAIN,
        messageBody: "It Works!",
        statusCode: "200",
      });
    });
  }
}
