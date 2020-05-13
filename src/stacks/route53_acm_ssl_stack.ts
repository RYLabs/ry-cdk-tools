// This is better to be in its own stack. 
// Reason being the yearly limit error as described
// here https://github.com/aws/aws-cdk/issues/5889
// By creating the certificate in its own stack
// AWS does not delete the certificate and you are able to 
// Break down and rebuild your stack without reaching 
// ACM Certificate limit.

import { Construct } from '@aws-cdk/core';
import { HostedZone, IHostedZone } from '@aws-cdk/aws-route53';
import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager';
import BaseStack from '../base_stacks/base_stack';
import { BaseStackProps } from '../base_stacks/base_stack';

export interface Route53AcmSslStackProps extends BaseStackProps {
  domainName: string;
}

export default class Route53AcmSslStack extends BaseStack {
  readonly sslCertificate: string;
  readonly hostedZone: IHostedZone;

  constructor(scope: Construct, id: string, props: Route53AcmSslStackProps){
    super(scope,id,{
      description: `Route53 HostedZone and ACM certificate for ${props.appName}-${props.appEnvironment}.`,
      ...props,
    });

    const {
      domainName,
    } = props;

    const hostedZone = HostedZone.fromLookup(this, `${this.conventions.eqn("camel")}`, {
      domainName,
    });
    
    const cert = new DnsValidatedCertificate(this, `${this.conventions.eqn("camel")}-SSL-Cert`,{
      domainName,
      hostedZone,
      region: 'us-east-1',
    });

    this.hostedZone = hostedZone;
    this.sslCertificate = cert.certificateArn

  }
}