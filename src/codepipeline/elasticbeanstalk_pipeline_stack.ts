import { App } from "@aws-cdk/core";
import BasePipelineStack, {
  BasePipelineStackProps,
} from "./base_pipeline_stack";
import { ElasticBeanstalkDeployAction } from "./actions/elasticbeanstalk_deploy_action";
import { CfnEnvironment } from "@aws-cdk/aws-elasticbeanstalk";

export interface ElasticbeanstalkPipelineStackProps
  extends BasePipelineStackProps {
  readonly applicationName?: string;
  readonly environmentName?: string;
  readonly environment?: CfnEnvironment;
}

/**
 * Trigger deploys to Elastic Beanstalk when code changes are committed to Github.
 */
export class ElasticbeanstalkPipelineStack extends BasePipelineStack {
  constructor(
    scope: App,
    id: string,
    props: ElasticbeanstalkPipelineStackProps
  ) {
    super(scope, id, {
      description: `Deploy to Elastic Beanstalk ${props.appInfo.name}-${props.appInfo.environment}`,
      ...props,
    });

    const { environment } = props;
    const {
      applicationName = environment?.applicationName,
      environmentName = environment?.environmentName,
    } = props;

    if (!applicationName)
      throw new Error("applicationName or environment is required");

    if (!environmentName)
      throw new Error("environmentName or environment is required");

    // input Needs Artifact from GithubSourceAction in BasePipelineStack
    this.pipeline.addStage({
      stageName: "Deploy",
      actions: [
        new ElasticBeanstalkDeployAction({
          actionName: "DeployToElasticBeanstalk",
          applicationName,
          environmentName,
          input: this.githubRepoArtifact,
        }),
      ],
    });
  }
}
