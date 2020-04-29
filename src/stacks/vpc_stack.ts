import { App } from "@aws-cdk/core";
import { Vpc, IVpc } from "@aws-cdk/aws-ec2";
import BaseStack, { BaseStackProps } from "../base_stacks/base_stack";

export interface VpcStackProps extends BaseStackProps {
  maxAzs: number;
}

export default class VpcStack extends BaseStack {
  vpc: IVpc;

  constructor(scope: App, id: string, props: VpcStackProps) {
    super(scope, id, {
      description: `VPC for the ${id} ${props.appEnvironment} environment`,
      ...props,
    });

    const { maxAzs = 2 } = props;
    this.vpc = new Vpc(this, "vpc", { maxAzs });
  }
}
