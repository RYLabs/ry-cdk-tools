import { App, Duration, RemovalPolicy, SecretValue } from "@aws-cdk/core";
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  IDatabaseInstance,
} from "@aws-cdk/aws-rds";
import {
  IVpc,
  InstanceType,
  InstanceClass,
  InstanceSize,
  SecurityGroup,
  ISecurityGroup,
} from "@aws-cdk/aws-ec2";
import { pick } from "lodash";
import BaseStack, { BaseStackProps } from "../base_stacks/base_stack";
import { Secret } from "@aws-cdk/aws-secretsmanager";

export const rdsDefaults = {
  backupRetention: Duration.days(7),
  instanceClass: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
  engine: DatabaseInstanceEngine.POSTGRES,
};

export interface RdsStackProps extends BaseStackProps {
  vpc: IVpc;
  backupRetention?: Duration;
  instanceClass?: InstanceType;
  engine?: DatabaseInstanceEngine;
  engineVersion?: string;
  masterUsername?: string;
  masterUserPassword?: SecretValue;
  storageEncrypted?: boolean;
  preferredBackupWindow?: string;
  preferredMaintenanceWindow?: string;
  removalPolicy?: RemovalPolicy;
}

export default class RdsStack extends BaseStack {
  dbInstance: IDatabaseInstance;
  masterUsername: string;
  masterPassword: SecretValue;
  databaseName: string;
  securityGroup: ISecurityGroup;

  constructor(scope: App, id: string, props: RdsStackProps) {
    super(scope, id, {
      description: `RDS for the ${id} ${props.appEnvironment} environment`,
      ...props,
    });

    const {
      vpc,
      backupRetention = rdsDefaults.backupRetention,
      instanceClass = rdsDefaults.instanceClass,
      engine = rdsDefaults.engine,
      removalPolicy,
      masterUsername = `${this.conventions.eqn("camel")}DbUser`,
      masterUserPassword = new Secret(
        this,

        // this name appears to get truncated by Secrets Manager, so best to best
        // to keep it short.
        `${this.conventions.eqn("path")}dbMasterPassword`,
        {
          generateSecretString: {
            includeSpace: false,

            // RDS doesn't like @ / or \ values.  Elasticbeanstalk will choke on
            // backticks, so to be safe we're just going to avoid all quote
            // characters.
            excludeCharacters: "\"'`@/\\",

            passwordLength: 16,
            secretStringTemplate: JSON.stringify({
              username: `${this.conventions.eqn("camel")}DbUser`,
            }),
            generateStringKey: "password",
          },
        }
      ).secretValueFromJson("password"),
    } = props;

    this.masterUsername = masterUsername;
    this.masterPassword = masterUserPassword;

    this.databaseName = this.conventions.eqn("underscore");
    this.securityGroup = new SecurityGroup(this, "securityGroup", { vpc });

    const db = new DatabaseInstance(this, "instance", {
      instanceIdentifier: this.conventions.eqn(),
      securityGroups: [this.securityGroup],
      backupRetention,
      instanceClass,
      vpc,
      engine,
      masterUsername,
      masterUserPassword,
      databaseName: this.databaseName,

      // These are values we don't provide defaults for, relying on defaults
      // defined by CDK.
      ...pick(
        props,
        "engineVersion",
        "storageEncrypted",
        "preferredBackupWindow",
        "preferredMaintenanceWindow"
      ),

      removalPolicy,
    });
    this.dbInstance = db;
  }
}
