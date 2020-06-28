import { Construct } from "@aws-cdk/core";
import { SecurityGroup, IVpc, Vpc, VpcLookupOptions } from "@aws-cdk/aws-ec2";
import BaseStack, { BaseStackProps } from "../base_stacks/base_stack";
import PostgresInstance from "../rds/postgres_instance";
import RyDatabaseInstance, {
  BaseRyDatabaseInstanceProps,
} from "../rds/ry_database_instance";

export interface RdsStackProps
  extends BaseStackProps,
    Pick<
      BaseRyDatabaseInstanceProps,
      Exclude<keyof BaseRyDatabaseInstanceProps, "conventions" | "vpc">
    > {
  /**
   * Provide the Vpc for the RDS using a direct reference or via lookup options
   */
  readonly vpc: IVpc | VpcLookupOptions;
}

export default class RdsStack extends BaseStack {
  dbInstance: RyDatabaseInstance;
  securityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: RdsStackProps) {
    super(scope, id, {
      description: `RDS for the ${id} ${props.appInfo.environment} environment`,
      ...props,
    });

    const { vpc: vpcProp, securityGroups = [] } = props;

    let vpc: IVpc;
    if ("stack" in vpcProp) {
      vpc = vpcProp;
    } else {
      vpc = Vpc.fromLookup(scope, "vpc", vpcProp);
    }

    this.securityGroup = new SecurityGroup(this, "securityGroup", { vpc });
    securityGroups.push(this.securityGroup);

    this.dbInstance = new PostgresInstance(this, "instance", {
      ...props,
      vpc,
      conventions: this.conventions,
      securityGroups,
    });
  }
}
