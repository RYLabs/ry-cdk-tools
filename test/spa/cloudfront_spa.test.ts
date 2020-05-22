import { SynthUtils } from "@aws-cdk/assert";
import { Stack } from "@aws-cdk/core";
import { HostedZone } from "@aws-cdk/aws-route53";
import { CloudfrontSpa } from "../../lib/spa";
import { Bucket } from "@aws-cdk/aws-s3";

test("creates a single page application", () => {
  const stack = new Stack();
  const hostedZone = new HostedZone(stack, "hostedZone", {
    zoneName: "example.com",
  });
  const bucket = new Bucket(stack, 'bucket', {
  });

  new CloudfrontSpa(stack, "spa", {
    subDomain: "test-site",
    certificateArn: "string",
    sourceBucket: bucket,
    domainName: "example.com",
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
