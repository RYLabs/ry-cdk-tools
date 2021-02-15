import { Construct, SecretValue } from "@aws-cdk/core";
import {
  ElasticbeanstalkEnvironment,
  ElasticbeanstalkEnvironmentProps,
  EBEnvironmentVariable,
} from "../constructs/elasticbeanstalk_environment";
import { ISecurityGroup, SecurityGroup, Port } from "@aws-cdk/aws-ec2";
import {
  DatabaseInstance,
  DatabaseInstanceAttributes,
  IDatabaseInstance,
} from "@aws-cdk/aws-rds";
import {
  Role,
  CfnRole,
  ServicePrincipal,
  ManagedPolicy,
  CfnInstanceProfile,
  IManagedPolicy,
} from "@aws-cdk/aws-iam";

const DEFAULT_SOLUTION_STACK_NAME =
  "64bit Amazon Linux 2 v3.2.2 running Ruby 2.7";

function railsEnvironmentVariables(
  db: DatabaseAccess,
  railsEnv: string,
  railsMasterKey?: SecretValue
): EBEnvironmentVariable[] {
  const envVars = [
    { name: "DATABASE_HOST", value: db.instance.dbInstanceEndpointAddress },
    { name: "DATABASE_PORT", value: db.instance.dbInstanceEndpointPort },
    { name: "DATABASE_USER", value: db.username },
    { name: "DATABASE_NAME", value: db.databaseName },
    { name: "DATABASE_PASSWORD", value: db.password.toString() },
    { name: "RAILS_ENV", value: railsEnv },
  ];

  if (railsMasterKey) {
    envVars.push({
      name: "RAILS_MASTER_KEY",
      value: railsMasterKey.toString(),
    });
  }
  return envVars;
}

export interface DatabaseAccessOptions {
  instance: IDatabaseInstance | DatabaseInstanceAttributes;
  securityGroup: ISecurityGroup | string;
  username: string;
  password: SecretValue | string;
  databaseName: string;
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
  databaseAccess: DatabaseAccessOptions;

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

  /**
   * Additional policies to attach to the ec2 role
   */
  ec2RoleManagedPolicies?: IManagedPolicy[];
}

function resolveDatabaseAccess(
  scope: Construct,
  options: DatabaseAccessOptions
) {
  return {
    instance:
      "node" in options.instance
        ? options.instance
        : DatabaseInstance.fromDatabaseInstanceAttributes(
            scope,
            "dbInst",
            options.instance
          ),
    securityGroup:
      typeof options.securityGroup === "string"
        ? SecurityGroup.fromSecurityGroupId(
            scope,
            "dbSecGrp",
            options.securityGroup
          )
        : options.securityGroup,
    username: options.username,
    password:
      typeof options.password === "string"
        ? SecretValue.secretsManager(options.password, {
            jsonField: options.password,
          })
        : options.password,
    databaseName: options.databaseName,
  };
}

export class RailsEnvironment extends Construct {
  ebEnvironment: ElasticbeanstalkEnvironment;

  constructor(scope: Construct, id: string, props: RailsEnvironmentProps) {
    super(scope, id);

    const {
      vpc,
      solutionStackName,
      databaseAccess,
      railsEnvironment = "production",
      railsMasterKey,
      applicationName,
      environmentName,
      environmentVariables = [],
      ec2RoleManagedPolicies = [],
      defaultProcess,
    } = props;

    const dbAccess = resolveDatabaseAccess(scope, databaseAccess);

    const securityGroup = new SecurityGroup(this, "securityGroup", { vpc });
    securityGroup.connections.allowTo(
      dbAccess.securityGroup,
      Port.tcp(dbAccess.instance.instanceEndpoint.port),
      `${id} app`
    );

    const role = new Role(scope, "role", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("AWSElasticBeanstalkWebTier"),
        ManagedPolicy.fromAwsManagedPolicyName("AWSElasticBeanstalkWorkerTier"),
        ManagedPolicy.fromAwsManagedPolicyName(
          "AWSElasticBeanstalkMulticontainerDocker"
        ),
        ...ec2RoleManagedPolicies,
      ],
      roleName: `${applicationName}-${environmentName}-ec2-role`,
    });

    const iamInstanceProfile = new CfnInstanceProfile(this, "instanceProfile", {
      instanceProfileName: `${applicationName}-${environmentName}-ec2-role`,
      roles: [role.roleName],
    });
    iamInstanceProfile.addDependsOn(role.node.defaultChild as CfnRole);

    const newEnvironmentVariables = environmentVariables.concat(
      railsEnvironmentVariables(dbAccess, railsEnvironment, railsMasterKey)
    );

    const ebEnv = new ElasticbeanstalkEnvironment(this, "ebEnv", {
      ...props,
      solutionStackName: solutionStackName || DEFAULT_SOLUTION_STACK_NAME,
      securityGroup,
      iamInstanceProfile,
      environmentVariables: newEnvironmentVariables,
      defaultProcess,
    });

    this.ebEnvironment = ebEnv;
  }
}
