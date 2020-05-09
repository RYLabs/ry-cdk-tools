import { SynthUtils } from "@aws-cdk/assert";
import { Stack } from "@aws-cdk/core";

import { S3Spa } from "../../lib/spa";

test("creates a single page application", () => {
  const stack = new Stack();
  new S3Spa(stack, "spa", {
    bucketName: "test-site",
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
