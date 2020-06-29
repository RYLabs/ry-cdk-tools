import { Vpc, IVpc, VpcLookupOptions } from "@aws-cdk/aws-ec2";
import { Construct } from "@aws-cdk/core";

export type IVpcLookup = IVpc | VpcLookupOptions;
export function resolveVpc(scope: Construct, lookup: IVpcLookup) {
  if ("stack" in lookup) {
    return lookup;
  } else {
    return Vpc.fromLookup(scope, "vpc", lookup);
  }
}
