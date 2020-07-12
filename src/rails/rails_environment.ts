import { Construct, SecretValue } from "@aws-cdk/core";
import {
  ElasticbeanstalkEnvironment,
  ElasticbeanstalkEnvironmentProps,
  EBEnvironmentVariable,
} from "../constructs/elasticbeanstalk_environment";
import { ISecurityGroup, SecurityGroup, Port } from "@aws-cdk/aws-ec2";
import { IDatabaseInstance } from "@aws-cdk/aws-rds";
import {
  Role,
  CfnRole,
  ServicePrincipal,
  ManagedPolicy,
  CfnInstanceProfile,
  IManagedPolicy,
} from "@aws-cdk/aws-iam";

const DEFAULT_SOLUTION_STACK_NAME =
  "64bit Amazon Linux 2018.03 v2.11.7 running Ruby 2.6 (Puma)";

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

  /**
   * Additional policies to attach to the ec2 role
   */
  ec2RoleManagedPolicies?: IManagedPolicy[];
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
    } = props;

    const securityGroup = new SecurityGroup(this, "securityGroup", { vpc });
    securityGroup.connections.allowTo(
      databaseAccess.securityGroup,
      Port.tcp(databaseAccess.instance.instanceEndpoint.port),
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
      railsEnvironmentVariables(
        databaseAccess,
        railsEnvironment,
        railsMasterKey
      )
    );

    const ebEnv = new ElasticbeanstalkEnvironment(this, "ebEnv", {
      ...props,
      solutionStackName: solutionStackName || DEFAULT_SOLUTION_STACK_NAME,
      securityGroup,
      iamInstanceProfile,
      environmentVariables: newEnvironmentVariables,
    });

    this.ebEnvironment = ebEnv;
  }
}
