import { Construct, SecretValue } from "@aws-cdk/core";
import {
  ElasticbeanstalkEnvironment,
  ElasticbeanstalkEnvironmentProps,
} from "../constructs/elasticbeanstalk_environment";
import { ISecurityGroup, SecurityGroup, Port } from "@aws-cdk/aws-ec2";
import { IDatabaseInstance } from "@aws-cdk/aws-rds";

const DEFAULT_SOLUTION_STACK_NAME =
  "64bit Amazon Linux 2018.03 v2.11.4 running Ruby 2.6 (Puma)";

function railsEnvironmentVariables(
  db: DatabaseAccess,
  railsEnv: string,
  railsMasterKey?: SecretValue
) {
  const envVars = [
    buildEnvVar("DATABASE_HOST", db.instance.dbInstanceEndpointAddress),
    buildEnvVar("DATABASE_PORT", db.instance.dbInstanceEndpointPort),
    buildEnvVar("DATABASE_USER", db.username),
    buildEnvVar("DATABASE_NAME", db.databaseName),
    buildEnvVar("DATABASE_PASSWORD", db.password.toString()),
    buildEnvVar("RAILS_ENV", railsEnv),
  ];

  if (railsMasterKey) {
    envVars.push(buildEnvVar("RAILS_MASTER_KEY", railsMasterKey.toString()));
  }
  return envVars;
}

export function buildEnvVar(optionName: string, value: string) {
  return {
    namespace: "aws:elasticbeanstalk:application:environment",
    optionName,
    value,
  };
}

export interface DatabaseAccess {
  instance: IDatabaseInstance;
  securityGroup: ISecurityGroup;
  username: string;
  password: SecretValue;
  databaseName: string;
}

export interface RailsEnvironmentProps
  extends Omit<
    ElasticbeanstalkEnvironmentProps,
    "solutionStackName" | "securityGroup"
  > {
  /**
   * Database access information for generating the database.yml
   */
  databaseAccess: DatabaseAccess;

  /**
   * RAILS_MASTER_KEY value
   */
  railsMasterKey?: SecretValue;

  /**
   * RAILS_ENV value
   *
   * @default production
   */
  railsEnvironment?: string;

  solutionStackName?: string;
}

export class RailsEnvironment extends Construct {
  elasticbeanstalkEnvironment: ElasticbeanstalkEnvironment;

  constructor(scope: Construct, id: string, props: RailsEnvironmentProps) {
    super(scope, id);

    const {
      vpc,
      solutionStackName,
      databaseAccess,
      railsEnvironment = "production",
      railsMasterKey,
    } = props;

    const securityGroup = new SecurityGroup(this, "securityGroup", { vpc });
    securityGroup.connections.allowTo(
      databaseAccess.securityGroup,
      Port.tcp(databaseAccess.instance.instanceEndpoint.port),
      `${id} app`
    );

    const ebEnv = new ElasticbeanstalkEnvironment(this, "ebEnv", {
      ...props,
      solutionStackName: solutionStackName || DEFAULT_SOLUTION_STACK_NAME,
      securityGroup,
      ...railsEnvironmentVariables(
        databaseAccess,
        railsEnvironment,
        railsMasterKey
      ),
    });

    this.elasticbeanstalkEnvironment = ebEnv;
  }
}
