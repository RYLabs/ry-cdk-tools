import { App } from "@aws-cdk/core";
import { Vpc, IVpc } from "@aws-cdk/aws-ec2";
import BaseStack, { BaseStackProps } from "../base_stacks/base_stack";

export default class VpcStack extends BaseStack {
  vpc: IVpc;

  constructor(scope: App, id: string, props: BaseStackProps) {
    super(scope, id, {
      description: `VPC for the ${id} ${props.appEnvironment} environment`,
      ...props,
    });
    this.vpc = new Vpc(this, "vpc", { maxAzs: 2 });
  }
}
