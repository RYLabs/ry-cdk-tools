import { Construct } from "@aws-cdk/core";
import { CommonAwsActionProps, Artifact, IAction,
         ActionProperties, ActionCategory, IStage,
         ActionBindOptions, ActionConfig } from "@aws-cdk/aws-codepipeline";
import { IRuleTarget, RuleProps, Rule } from "@aws-cdk/aws-events";
import { ManagedPolicy } from "@aws-cdk/aws-iam";

export interface ElasticBeanstalkDeployActionProps extends CommonAwsActionProps {
  appName: string;
  envName: string;
  input: Artifact;
}

export class ElasticBeanstalkDeployAction implements IAction {
  public readonly actionProperties: ActionProperties;
  private readonly props: ElasticBeanstalkDeployActionProps;

  constructor(props: ElasticBeanstalkDeployActionProps) {
    this.actionProperties = {
      ...props,
      provider: "ElasticBeanstalk",
      category: ActionCategory.DEPLOY,
      artifactBounds: {
        minInputs: 1,
        maxInputs: 1,
        minOutputs: 0,
        maxOutputs: 0
      },
      inputs: [props.input]
    };
    this.props = props;
  }

  public bind(
    _scope: Construct,
    _stage: IStage,
    options: ActionBindOptions
  ): ActionConfig {
    options.bucket.grantRead(options.role);
    options.role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "AWSElasticBeanstalkFullAccess"
      )
    );

    return {
      configuration: {
        ApplicationName: this.props.appName,
        EnvironmentName: this.props.envName
      }
    };
  }

  public onStateChange(
    _name: string,
    _target?: IRuleTarget,
    _options?: RuleProps
  ): Rule {
    throw new Error("unsupported");
  }
}