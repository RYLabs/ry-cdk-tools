import { Construct } from "@aws-cdk/core";
import { IVpc, SecurityGroup } from "@aws-cdk/aws-ec2";
import {
  ApplicationListener,
  ApplicationLoadBalancer,
  ContentType,
  IListenerCertificate,
} from "@aws-cdk/aws-elasticloadbalancingv2";
import { Conventions } from "../core";

export interface SimpleLoadBalancerProps {
  readonly vpc: IVpc;
  readonly conventions: Conventions;
  readonly httpsCertificates?: IListenerCertificate[];
}

export class SimpleLoadBalancer extends Construct {
  readonly alb: ApplicationLoadBalancer;
  readonly httpListener: ApplicationListener;
  readonly httpsListener: ApplicationListener;
  readonly securityGroup: SecurityGroup;

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
