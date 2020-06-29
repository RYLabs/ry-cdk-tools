import { App, SecretValue } from "@aws-cdk/core";
import {
  CfnApplicationVersion,
  CfnApplication,
} from "@aws-cdk/aws-elasticbeanstalk";
import BaseStack, { BaseStackProps } from "../base_stacks/base_stack";
import { RailsEnvironment, RailsEnvironmentProps } from "./rails_environment";
import { Conventions } from "../core";
import { SessionAccess } from "../constructs/session_access";
import { IVpcLookup, resolveVpc } from "../utils/lookups";

function defaultRailsMasterKey(conventions: Conventions) {
  const secretKey = `${conventions.eqn("camel")}SecretKeyBase`;
  return SecretValue.secretsManager(secretKey, {
    jsonField: secretKey,
  });
}

export interface RailsStackProps
  extends BaseStackProps,
    Omit<
      RailsEnvironmentProps,
      "applicationName" | "environmentName" | "applicationVersion" | "vpc"
    > {
  /**
   * The Elasticbeanstalk application name.
   *
   * @default appInfo.name
   */
  readonly applicationName?: string;

  /**
   * The Elasticbeanstalk environment name.
   */
  readonly environmentName?: string;

  /**
   * Provide the Vpc for the RDS using a direct reference or via lookup options
   */
  readonly vpc: IVpcLookup;

  readonly applicationVersion?: CfnApplicationVersion;

  readonly application?: CfnApplication;
}

export class RailsStack extends BaseStack {
  readonly application: CfnApplication;

  constructor(scope: App, id: string, props: RailsStackProps) {
    super(scope, id, {
      description: `Elasticbeanstalk setup for ${id}`,
      ...props,
    });

    const {
      applicationName = props.appInfo.name,
      environmentName = this.conventions.eqn(),
      ec2InstanceTypes = ["t3.micro"],
      rootVolumeType = "gp2",
      rootVolumeSize = 50,
      vpc,
    } = props;

    // Setup the EB app.
    const application =
      props.application ||
      new CfnApplication(this, "rails", {
        applicationName,
      });

    // Setup the starter application bundle.  All environments will start off
    // with this.  Will be replaced by CodePipeline later in the setup.
    const applicationVersion =
      props.applicationVersion ||
      new CfnApplicationVersion(this, "railsAppVer", {
        applicationName,

        // Elasticbeanstalk configuration requires an app bundle right off the
        // bat, so we're going to use a "starter" bundle which is just a very
        // basic Rails app.
        sourceBundle: {
          s3Bucket: "rails-cdk",
          s3Key: "starterApp.zip",
        },
      });
    applicationVersion.addDependsOn(application);

    // Rails master key
    const railsMasterKey =
      props.railsMasterKey || defaultRailsMasterKey(this.conventions);

    const railsEnvironment = new RailsEnvironment(this, "railsEnv", {
      ...props,
      vpc: resolveVpc(this, vpc),
      applicationName,
      environmentName,
      applicationVersion,
      railsMasterKey,
      ec2InstanceTypes,
      rootVolumeType,
      rootVolumeSize,
    });

    new SessionAccess(this, "sessionAccess", {
      name: this.conventions.eqn("camel"),
      ec2InstanceTag: "elasticbeanstalk:environment-name",
      ec2InstanceTagValue: environmentName,
    });

    this.application = application
  }
}
