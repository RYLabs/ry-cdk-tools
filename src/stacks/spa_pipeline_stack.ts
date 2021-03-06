import { CfnOutput, RemovalPolicy, Construct } from "@aws-cdk/core";
import BasePipelineStack, {
  BasePipelineStackProps,
} from "../codepipeline/base_pipeline_stack";
import { Bucket } from "@aws-cdk/aws-s3";
import { PipelineProject, BuildSpec } from "@aws-cdk/aws-codebuild";
import { Artifact } from "@aws-cdk/aws-codepipeline";
import {
  CodeBuildAction,
  S3DeployAction,
} from "@aws-cdk/aws-codepipeline-actions";

function isProduction(env: string) {
  return env === "prod" || env === "production";
}

export interface SpaPipelineStackProps extends BasePipelineStackProps {
  subDomain?: string;
}

export default class SpaPipelineStack extends BasePipelineStack {
  constructor(scope: Construct, id: string, props: SpaPipelineStackProps) {
    super(scope, id, {
      description: `Pipeline, Build & Deploy to S3 bucket for ${props.appInfo.name}-${props.appInfo.environment} SPA Application`,
      ...props,
    });

    const { appInfo } = props;
    const {
      subDomain = isProduction(appInfo.environment)
        ? id
        : this.conventions.eqn("dash"),
    } = props;

    const bucketWebsite = new Bucket(this, "siteBucket", {
      bucketName: subDomain.toLowerCase(),
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      publicReadAccess: true,
      removalPolicy: RemovalPolicy.DESTROY,
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
          bucket: bucketWebsite,
        }),
      ],
    });

    new CfnOutput(this, `${this.conventions.eqn("camel")}URL`, {
      value: bucketWebsite.bucketWebsiteUrl,
      description: "URL for Website",
    });
  }
}
