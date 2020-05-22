import { Construct } from "@aws-cdk/core";
import { Pipeline, Artifact } from "@aws-cdk/aws-codepipeline";
import { ElasticBeanstalkDeployAction } from '../actions/elastic_beanstalk_deploy_action';

export interface RailsPipelineProps {
  /**
   * Required for Elastic Beanstalk Deploy Action as there is no longer a 
   * base pipeline.
   */
  appName: string;
  /**
   * Required for Elastic Beanstalk Deploy Action as there is no longer a 
   * base pipeline.
   */
  appEnv: string;
  /**
   * An existing pipeline is needed to be able to add the stage.
   */
  pipeline: Pipeline;
  /**
   * Source artifact created from a source action pipeline
   */
  sourceArtifact: Artifact;
}
/**
 * RailsPipeline adds a deploy action to an existing pipeline.
 */
export default class RailsPipeline extends Construct {
  constructor(scope: Construct, id: string, props: RailsPipelineProps){
    super(scope, id);
    
    const {
      appName,
      appEnv,
      pipeline,
      sourceArtifact,
    } = props;

    pipeline.addStage({
      stageName: "DeployToEB",
      actions: [
        new ElasticBeanstalkDeployAction({
          actionName: "DeployToEB",
          appName: appName,
          envName: `${appName}-${appEnv}`,
          input: sourceArtifact,
        }),
      ],
    });
  }
}