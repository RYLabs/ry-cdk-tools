import { App, Stack } from "@aws-cdk/core";
import { Vpc } from "@aws-cdk/aws-ec2";
import "@aws-cdk/assert/jest";

import { RdsStack } from "../../lib/rds";

test("Set an RDS Stack", () => {
  const app = new App();
  const stack = new Stack(app, "VpcStack");
  const vpc = new Vpc(stack, "VPC");
  const rds = new RdsStack(app, "RDS", {
    appName: "app",
    appEnvironment: "dev",
    vpc,
  });
  expect(rds).toBeDefined();
});
