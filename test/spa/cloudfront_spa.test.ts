import { SynthUtils } from "@aws-cdk/assert";
import { Stack } from "@aws-cdk/core";
import { HostedZone } from "@aws-cdk/aws-route53";
import { CloudfrontSpa } from "../../lib/spa";

test("creates a single page application", () => {
  const stack = new Stack();
  const hostedZone = new HostedZone(stack, "hostedZone", {
    zoneName: "example.com",
  });
  new CloudfrontSpa(stack, "spa", {
    subDomain: "test-site",
    hostedZone,
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
