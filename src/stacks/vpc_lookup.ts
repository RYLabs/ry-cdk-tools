import { App } from "@aws-cdk/core";
import { Vpc, IVpc } from "@aws-cdk/aws-ec2";
import BaseStack, { BaseStackProps } from "../base_stacks/base_stack";

export interface VpcLookUpProps extends BaseStackProps {
  vpcId?: string;
  vpcName?: string;
}

export default class VpcLookUp extends BaseStack {
  vpc: IVpc;

  constructor(scope: App, id: string, props: VpcLookUpProps) {
    super(scope, id, {
      description: 'Select an existing VPC to use with your application.',
      ...props,
    });

    if(!props.vpcId || !props.vpcName)
      console.warn("Using default VPC from your selected",
                   "Region. Add a vpcId or vpcName to",
                   "select an existing VPC");

    if (props.vpcId)
      this.vpc = Vpc.fromLookup(this, 'vpc', {
        vpcId: props.vpcId,
      });
    else if (props.vpcName)
      this.vpc = Vpc.fromLookup(this, 'vpc', {
        vpcName: props.vpcName,
      });
    else
      this.vpc = Vpc.fromLookup(this, 'vpc', {
        isDefault: true,
      });
    
  }
}
