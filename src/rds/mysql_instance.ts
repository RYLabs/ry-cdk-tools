import RyDatabaseInstance, {
  BaseRyDatabaseInstanceProps,
} from "./ry_database_instance";
import { Construct } from "@aws-cdk/core";
import { DatabaseInstanceEngine } from "@aws-cdk/aws-rds";

export interface MysqlInstanceProps extends BaseRyDatabaseInstanceProps {}

export default class PostgresInstance extends RyDatabaseInstance {
  constructor(scope: Construct, id: string, props: MysqlInstanceProps) {
    super(scope, id, {
      ...props,
      engine: DatabaseInstanceEngine.MYSQL,
    });
  }
}
