import { CfnOutput, Construct } from "@aws-cdk/core";
import BasePipelineStack, {
  BasePipelineStackProps,
} from "../base_stacks/base_pipeline_stack";
import { PipelineProject, BuildSpec } from "@aws-cdk/aws-codebuild";
import { Artifact } from "@aws-cdk/aws-codepipeline";
import {
  CodeBuildAction,
  S3DeployAction,
} from "@aws-cdk/aws-codepipeline-actions";
import S3Spa from "../spa/s3_spa";

export interface S3SpaPipelineStackProps extends BasePipelineStackProps {
  // Name of the website S3 bucket, this will be part of the final name of the URL.
  siteBucketName?: string;
}

export default class S3SpaPipelineStack extends BasePipelineStack {
  constructor(scope: Construct, id: string, props: S3SpaPipelineStackProps) {
    super(scope, id, {
      description: `Pipeline, Build & Deploy to S3 bucket for ${props.appName}-${props.appEnvironment} SPA Application`,
      ...props,
    });

    const {
      siteBucketName = this.conventions.eqn("dash").toLowerCase(),
    } = props;

    const spa = new S3Spa(this, "spa", {
      bucketName: siteBucketName,
    });

    const outputWebsite = new Artifact();

    const project = new PipelineProject(this, "project", {
      projectName: `${this.conventions.eqn("dash")}-spa`,
      buildSpec: BuildSpec.fromSourceFilename("./buildspec.yml"),
    });

    // input Needs Artifact from GithubSourceAction in BasePipelineStack
    this.pipeline.addStage({
      stageName: "Build",
      actions: [
        // AWS CodePipeline action to run CodeBuild project
        new CodeBuildAction({
          actionName: "Website",
          project,
          input: this.githubRepoArtifact,
          outputs: [outputWebsite],
        }),
      ],
    });

    this.pipeline.addStage({
      stageName: "Deploy",
      actions: [
        // AWS CodePipeline action to deploy CRA website to S3
        new S3DeployAction({
          actionName: "Website",
          input: outputWebsite,
          bucket: spa.bucket,
        }),
      ],
    });

    new CfnOutput(this, "SPA Site", {
      value: spa.websiteUrl,
      description: `Project URL for ${this.conventions.eqn("dash")}`,
    });
  }
}
