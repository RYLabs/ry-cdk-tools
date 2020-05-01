import { SynthUtils } from "@aws-cdk/assert";
import { Stack } from "@aws-cdk/core";
import { Vpc } from "@aws-cdk/aws-ec2";

import { PostgresInstance } from "../../lib/rds";
import Conventions from "../../lib/constructs/conventions";

test("creates a Postgres instance", () => {
  const stack = new Stack();
  const vpc = new Vpc(stack, "VPC");
  const conventions = new Conventions("app", "dev");
  new PostgresInstance(stack, "Postgres", {
    vpc,
    conventions,
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
