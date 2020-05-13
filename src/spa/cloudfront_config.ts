import { Construct, CfnOutput } from '@aws-cdk/core';
import { IBucket } from '@aws-cdk/aws-s3';
import { IHostedZone, ARecord, RecordTarget } from '@aws-cdk/aws-route53';
import { CloudFrontTarget } from '@aws-cdk/aws-route53-targets/lib';
import {
  CloudFrontWebDistribution,
  SSLMethod,
  SecurityPolicyProtocol
} from '@aws-cdk/aws-cloudfront';

export interface CloudFrontConfigProps {
  subDomain?: string;
  /**
   * certificateArn: "arn:aws:acm:region:123456789012:certificate/12345678-1234-1234-1234-123456789012"
   * This value can be entered manually from your own certficate stored with ACM
   * or you can create Route53AcmSslStack.  
   */
  certificateArn: string;
  /**
   *  sourceBucket: IBucket
   *  The S3 bucket where your live project is located.
   */
  sourceBucket: IBucket;
  /**
   *  hostedZone: IHostedZone
   *  Route53 HostedZone created via Route53AcmSslStack
   */
  hostedZone: IHostedZone;
}

export default class CloudFrontConfig extends Construct {
  constructor(scope: Construct, id: string, props: CloudFrontConfigProps) {
    super(scope, id);

    const {
      subDomain = "www",
      certificateArn,
      sourceBucket,
      hostedZone,
    } = props;

    const fullDomain = subDomain + "." + hostedZone.zoneName;
    
    const distribution = new CloudFrontWebDistribution(this, `projectDistribution`, {
      aliasConfiguration: {
        acmCertRef: certificateArn,
        names: [fullDomain],
        sslMethod: SSLMethod.SNI,
        securityPolicy: SecurityPolicyProtocol.TLS_V1_2_2018
      },
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: sourceBucket,
          },
          behaviors: [ {isDefaultBehavior: true} ]
        },
      ],
    });

    new ARecord(this, 'SiteAliasRecord', {
      recordName: fullDomain,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone: hostedZone,
    });

    new CfnOutput(this, 'Project HTTPS URL', {
      value: 'https://' + fullDomain,
      description: 'Project URL using CloudFront Route53 for SSL'
    });
  }
}
