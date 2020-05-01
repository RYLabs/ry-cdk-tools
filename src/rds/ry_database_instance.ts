import {
  DatabaseInstance,
  DatabaseInstanceProps,
  DatabaseInstanceEngine,
} from "@aws-cdk/aws-rds";
import { SecretValue, Construct, Duration } from "@aws-cdk/core";
import {
  SecurityGroup,
  InstanceType,
  InstanceClass,
  InstanceSize,
} from "@aws-cdk/aws-ec2";
import { Secret } from "@aws-cdk/aws-secretsmanager";
import Conventions from "../constructs/conventions";

export const instanceDefaults = {
  backupRetention: Duration.days(7),
  instanceClass: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
};

export type AltDatabaseInstanceProps = Omit<
  DatabaseInstanceProps,
  "masterUsername"
>;

export type BaseRyDatabaseInstanceProps = Omit<
  RyDatabaseInstanceProps,
  "engine"
>;

export interface RyDatabaseInstanceProps extends AltDatabaseInstanceProps {
  readonly conventions: Conventions;
  readonly masterUsername?: string;
}

export default class RyDatabaseInstance extends DatabaseInstance {
  masterUsername: string;
  masterPassword: SecretValue;
  databaseName: string;
  securityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: RyDatabaseInstanceProps) {
    const {
      conventions,

      masterUsername = `${conventions.eqn("camel")}DbUser`,
      masterUserPassword = new Secret(
        scope,

        // this name appears to get truncated by Secrets Manager, so best to best
        // to keep it short.
        `${conventions.eqn("path")}dbMasterPassword`,

        {
          generateSecretString: {
            includeSpace: false,

            // RDS doesn't like @ / or \ values.  Elasticbeanstalk will choke on
            // backticks, so to be safe we're just going to avoid all quote
            // characters.
            excludeCharacters: "{}[]\"'`@/\\",

            passwordLength: 16,
            secretStringTemplate: JSON.stringify({
              username: `${conventions.eqn("camel")}DbUser`,
            }),
            generateStringKey: "password",
          },
        }
      ).secretValueFromJson("password"),

      databaseName = conventions.eqn("underscore"),
      instanceIdentifier = conventions.eqn(),
      engine,
    } = props;

    super(scope, id, {
      ...instanceDefaults,
      ...props,

      masterUsername,
      masterUserPassword,
      databaseName,
      instanceIdentifier,
    });

    this.masterUsername = masterUsername;
    this.masterPassword = masterUserPassword;
    this.databaseName = databaseName;
  }
}
