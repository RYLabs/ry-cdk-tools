import { Construct } from "@aws-cdk/core";
import { IVpc, SecurityGroup } from "@aws-cdk/aws-ec2";
import {
  ApplicationListener,
  ApplicationLoadBalancer,
  ContentType,
  IListenerCertificate,
} from "@aws-cdk/aws-elasticloadbalancingv2";
import { Certificate } from "@aws-cdk/aws-certificatemanager";
import { Conventions } from "../core";

export interface SimpleLoadBalancerProps {
  readonly vpc: IVpc;
  readonly conventions: Conventions;
  readonly httpsCertificateArn?: string;
  readonly httpsCertificates?: IListenerCertificate[];
}

export class SimpleLoadBalancer extends Construct {
  readonly alb: ApplicationLoadBalancer;
  readonly httpListener: ApplicationListener;
  readonly httpsListener: ApplicationListener;
  readonly securityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: SimpleLoadBalancerProps) {
    super(scope, id);

    const {
      vpc,
      httpsCertificateArn,
      httpsCertificates = [],
      conventions,
    } = props;

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

    if (httpsCertificateArn) {
      httpsCertificates.push(
        Certificate.fromCertificateArn(this, "httpsCert", httpsCertificateArn)
      );
    }

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
