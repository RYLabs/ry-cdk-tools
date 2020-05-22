import { Construct, CfnOutput } from "@aws-cdk/core";
import { IBucket } from "@aws-cdk/aws-s3";
import {
  IHostedZone,
  ARecord,
  RecordTarget,
  HostedZone,
} from "@aws-cdk/aws-route53";
import { CloudFrontTarget } from "@aws-cdk/aws-route53-targets/lib";
import { DnsValidatedCertificate } from "@aws-cdk/aws-certificatemanager";
import S3Spa from "./s3_spa";
import { CloudFrontWebDistribution } from "@aws-cdk/aws-cloudfront";

export interface CloudfrontSpaProps {
  subDomain?: string;
  /**
   * certificateArn: "arn:aws:acm:region:123456789012:certificate/12345678-1234-1234-1234-123456789012"
   * This value can be entered manually from your own certficate stored with ACM
   * or you can create Route53AcmSslStack.
   */
  certificateArn?: string;
  /**
   *  sourceBucket: IBucket
   *  The S3 bucket where your live project is located.
   *  If no bucket is provided then a new bucket is created.
   */
  sourceBucket?: IBucket;
  domainName: string;
}

function createCert(scope: any, domainName: string, zone: IHostedZone) {
  const cert = new DnsValidatedCertificate(scope, "projectCertificate", {
    domainName: domainName,
    hostedZone: zone,
  });
  return cert.certificateArn;
}

function createBucket(scope: any) {
  const bucket = new S3Spa(scope, "projectBucket", {
    bucketName: scope.conventions.eqn("dash").toLowerCase(),
  });
  return bucket;
}

export default class CloudfrontSpa extends Construct {
  constructor(scope: Construct, id: string, props: CloudfrontSpaProps) {
    super(scope, id);

    const {
      subDomain = "www",
      certificateArn,
      sourceBucket,
      domainName,
    } = props;

    const hostedZone = HostedZone.fromLookup(this, "projectHostedZone", {
      domainName: domainName,
    });

    const fullDomain = subDomain + "." + hostedZone.zoneName;

    const distribution = new CloudFrontWebDistribution(
      this,
      `projectDistribution`,
      {
        aliasConfiguration: {
          acmCertRef:
            certificateArn || createCert(this, domainName, hostedZone),
          names: [fullDomain, domainName],
        },
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: sourceBucket || createBucket(this).bucket,
            },
            behaviors: [{ isDefaultBehavior: true }],
          },
        ],
      }
    );

    new ARecord(this, "SiteAliasRecord", {
      recordName: fullDomain,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone: hostedZone,
    });

    new CfnOutput(this, "Project HTTPS URL", {
      value: "https://" + fullDomain,
      description: "Project URL using CloudFront Route53 for SSL",
    });
  }
}
