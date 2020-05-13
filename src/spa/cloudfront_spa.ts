import { Construct, RemovalPolicy } from "@aws-cdk/core";
import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager';
import { IHostedZone, ARecord, RecordTarget } from '@aws-cdk/aws-route53';
import { CloudFrontWebDistribution, SSLMethod, SecurityPolicyProtocol } from '@aws-cdk/aws-cloudfront';
import { Bucket } from "@aws-cdk/aws-s3";
import { CloudFrontTarget } from '@aws-cdk/aws-route53-targets/lib';

export interface CloudFrontSpaProps {
  // prefix for website address www. api. test.
  subDomain: string;
  hostedZone: IHostedZone;
}

// Single page application using Cloudfront
export default class CloudfrontSpa extends Construct {
  bucket: Bucket;
  websiteUrl: string;

  // Construct needed to be passed for the creation of resources.
  constructor(scope: Construct, id: string, props: CloudFrontSpaProps){
    super(scope, id);

    const {
      hostedZone,
      subDomain,
    } = props

    this.bucket = new Bucket(this, "siteBucket", {
      bucketName: `${id.toLowerCase()}-cloudfrontspa`,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const fullDomain = subDomain + "." + hostedZone.zoneName

    const cert = new DnsValidatedCertificate(scope, "httpsCert", {
      domainName: `*.${hostedZone.zoneName}`,
      hostedZone,

      // Cloudfront always looks for certs in us-east-1
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
            s3BucketSource: this.bucket
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

    this.websiteUrl = `https://${subDomain}.${hostedZone.zoneName}`;
  }
} 