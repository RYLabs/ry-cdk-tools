import { Construct } from "@aws-cdk/core";
import { Vpc } from "@aws-cdk/aws-ec2";
import BaseStack, { BaseStackProps } from "../base_stacks/base_stack";

export interface VpcStackProps extends BaseStackProps {
  maxAzs?: number;
}

export default class VpcStack extends BaseStack {
  vpc: Vpc;

  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, {
      description: `VPC for the ${id} ${props.appEnv.appEnvironment} environment`,
      ...props,
    });

    const { maxAzs = 2 } = props;
    this.vpc = new Vpc(this, "vpc", { maxAzs });
  }
}
