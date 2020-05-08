import { Construct } from "@aws-cdk/core";
import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager';
import { HostedZone, ARecord, RecordTarget } from '@aws-cdk/aws-route53';
import { CloudFrontWebDistribution, SSLMethod, SecurityPolicyProtocol } from '@aws-cdk/aws-cloudfront';
import { Bucket } from "@aws-cdk/aws-s3";
import { CloudFrontTarget } from '@aws-cdk/aws-route53-targets/lib';

export interface CloudFrontDomainSSLProps {
  // prefix for website address www. api. test.
  subDomain: string;
  domainName: string;  // address for website example.com
  bucket: Bucket; // This is the Bucket used in the final deploy section of the pipeline It could also be an IBucket
}

export default class CloudFrontDomainSSL {
  // Construct needed to be passed for the creation of resources.
  constructor(scope: Construct, id: string, props: CloudFrontDomainSSLProps){
    
    const {
      domainName,
      subDomain,
      bucket,
    } = props

    const fullDomain = subDomain + "." + domainName
    
    const hostedZone = HostedZone.fromLookup(scope, 'Zone', {
      domainName: domainName,
    });

    const cert = new DnsValidatedCertificate(scope, "httpsCert", {
      domainName: `*.${domainName}`,
      hostedZone,
      region: "us-east-1"
    });

    const distribution = new CloudFrontWebDistribution(scope, 'MyDistribution', {
      aliasConfiguration: {
        acmCertRef: cert.certificateArn,
        names: [fullDomain],
        sslMethod: SSLMethod.SNI,
        securityPolicy: SecurityPolicyProtocol.TLS_V1_2_2018
      },
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket
          },
          behaviors : [ {isDefaultBehavior: true}]
        }
      ]
    });

    new ARecord(scope, 'SiteAliasRecord', {
      recordName: fullDomain,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone: hostedZone,
    });
  }
} 