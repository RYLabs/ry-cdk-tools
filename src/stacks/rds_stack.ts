import { App } from "@aws-cdk/core";
import { SecurityGroup } from "@aws-cdk/aws-ec2";
import BaseStack, { BaseStackProps } from "../base_stacks/base_stack";
import PostgresInstance from "../rds/postgres_instance";
import RyDatabaseInstance, {
  BaseRyDatabaseInstanceProps,
} from "../rds/ry_database_instance";

export interface RdsStackProps
  extends BaseStackProps,
    BaseRyDatabaseInstanceProps {}

export default class RdsStack extends BaseStack {
  dbInstance: RyDatabaseInstance;
  securityGroup: SecurityGroup;

  constructor(scope: App, id: string, props: RdsStackProps) {
    super(scope, id, {
      description: `RDS for the ${id} ${props.appEnvironment} environment`,
      ...props,
    });

    const { vpc, securityGroups = [] } = props;

    this.securityGroup = new SecurityGroup(this, "securityGroup", { vpc });
    securityGroups.push(this.securityGroup);

    this.dbInstance = new PostgresInstance(this, "instance", {
      ...props,
      securityGroups,
    });
  }
}
