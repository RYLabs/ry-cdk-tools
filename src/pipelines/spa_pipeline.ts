import { Construct } from "@aws-cdk/core";
import { Artifact, Pipeline } from "@aws-cdk/aws-codepipeline";
import { PipelineProject, BuildSpec } from "@aws-cdk/aws-codebuild";
import {
  CodeBuildAction,
  S3DeployAction,
} from "@aws-cdk/aws-codepipeline-actions";
import { IBucket } from "@aws-cdk/aws-s3";

export interface SpaPipelineProps {
  projectName: string;
  pipeline: Pipeline;
  githubRepoArtifact: Artifact;
  websiteBucket: IBucket;
}

export default class SpaPipeline extends Construct {
  constructor(scope: Construct, id: string, props: SpaPipelineProps) {
    super(scope, id);

    const { projectName, pipeline, githubRepoArtifact, websiteBucket } = props;

    const outputWebsite = new Artifact();

    const project = new PipelineProject(this, "project", {
      projectName: `${projectName}-spa`,
      buildSpec: BuildSpec.fromSourceFilename("./buildspec.yml"),
    });

    pipeline.addStage({
      stageName: "Build",
      actions: [
        // AWS CodePipeline action to run CodeBuild project
        new CodeBuildAction({
          actionName: "Website",
          project,
          input: githubRepoArtifact,
          outputs: [outputWebsite],
        }),
      ],
    });

    pipeline.addStage({
      stageName: "Deploy",
      actions: [
        // AWS CodePipeline action to deploy CRA website to S3
        new S3DeployAction({
          actionName: "Website",
          input: outputWebsite,
          bucket: websiteBucket,
        }),
      ],
    });
  }
}
