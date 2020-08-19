import {
  DatabaseInstance,
  DatabaseInstanceProps,
  IDatabaseInstance,
} from "@aws-cdk/aws-rds";
import { SecretValue, Construct, Duration } from "@aws-cdk/core";
import {
  SecurityGroup,
  ISecurityGroup,
  InstanceType,
  InstanceClass,
  InstanceSize,
} from "@aws-cdk/aws-ec2";
import { Secret } from "@aws-cdk/aws-secretsmanager";
import Conventions from "../utils/conventions";

export const instanceDefaults = {
  backupRetention: Duration.days(7),
  instanceClass: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
};

export type AltDatabaseInstanceProps = Omit<
  DatabaseInstanceProps,
  "masterUsername" | "instanceClass"
>;

export type BaseRyDatabaseInstanceProps = Omit<
  RyDatabaseInstanceProps,
  "engine"
>;

export interface IRyDatabaseInstance extends IDatabaseInstance {
  masterUsername: string;
  masterPassword: SecretValue;
  databaseName: string;
}

export interface RyDatabaseInstanceAttributes {
  readonly conventions?: Conventions;
  readonly masterUsername?: string;
  readonly masterPassword: SecretValue;
  readonly databaseName?: string;
  readonly instanceIdentifier?: string;
  readonly instanceEndpointAddress: string;
  readonly port: number;
  readonly securityGroups?: ISecurityGroup[];
}

export interface RyDatabaseInstanceProps extends AltDatabaseInstanceProps {
  readonly conventions: Conventions;
  readonly masterUsername?: string;
  readonly instanceClass?: InstanceType;
}

function defaultMasterUsername(conventions: Conventions) {
  return `${conventions.eqn("camel")}DbUser`;
}

function defaultDatabaseName(conventions: Conventions) {
  return conventions.eqn("underscore");
}

function defaultInstanceIdentifier(conventions: Conventions) {
  return conventions.eqn();
}

export default class RyDatabaseInstance extends DatabaseInstance
  implements IRyDatabaseInstance {
  masterUsername: string;
  masterPassword: SecretValue;
  databaseName: string;
  securityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: RyDatabaseInstanceProps) {
    const { conventions } = props;
    const {
      masterUsername = defaultMasterUsername(conventions),
      databaseName = defaultDatabaseName(conventions),
      instanceIdentifier = defaultInstanceIdentifier(conventions),
    } = props;
    const {
      masterUserPassword = new Secret(
        scope,

        // this name appears to get truncated by Secrets Manager, so best to best
        // to keep it short.
        `${conventions.eqn("path")}dbMasterPassword`,
        {
          description: `password for ${conventions.eqn()} database`,
          generateSecretString: {
            includeSpace: false,

            // RDS doesn't like @ / or \ values.  Elasticbeanstalk will choke on
            // backticks, so to be safe we're just going to avoid all quote
            // characters.  Also exclude % for URI escape codes
            excludeCharacters: "{}[]\"'`@/\\%",

            passwordLength: 16,
            secretStringTemplate: JSON.stringify({
              username: masterUsername,
            }),
            generateStringKey: "password",
          },
        }
      ).secretValueFromJson("password"),
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

  static fromRyDatabaseInstanceAttributes(
    scope: Construct,
    id: string,
    attrs: RyDatabaseInstanceAttributes
  ): IRyDatabaseInstance {
    const { conventions } = attrs;
    let {
      masterPassword,
      masterUsername,
      databaseName,
      instanceIdentifier,
      instanceEndpointAddress,
      port,
      securityGroups = [],
    } = attrs;

    if (conventions) {
      if (!masterUsername) masterUsername = defaultMasterUsername(conventions);
      if (!databaseName) {
        databaseName = defaultDatabaseName(conventions);
      }
      if (!instanceIdentifier) {
        instanceIdentifier = defaultInstanceIdentifier(conventions);
      }
    } else if (!masterUsername || !databaseName || !instanceIdentifier) {
      throw new Error(
        "masterUsername, databaseName, instanceIdentifier attributes are required if conventions is not specified"
      );
    }

    const instance = DatabaseInstance.fromDatabaseInstanceAttributes(
      scope,
      id,
      {
        instanceIdentifier,
        instanceEndpointAddress,
        port,
        securityGroups,
      }
    );

    return { ...instance, masterUsername, masterPassword, databaseName };
  }
}
