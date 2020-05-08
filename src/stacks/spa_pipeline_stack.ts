import { CfnOutput, RemovalPolicy, Construct } from "@aws-cdk/core";
import BasePipelineStack, {
  BasePipelineStackProps,
} from "../base_stacks/base_pipeline_stack";
import { Bucket } from "@aws-cdk/aws-s3";
import { PipelineProject, BuildSpec } from "@aws-cdk/aws-codebuild";
import { Artifact } from "@aws-cdk/aws-codepipeline";
import {
  CodeBuildAction,
  S3DeployAction,
} from "@aws-cdk/aws-codepipeline-actions";
import CloudFrontDomainSSL from "../constructs/cloudfront_domain_ssl";

function isProduction(env: string) {
  return env === "prod" || env === "production";
}

export interface SpaPipelineStackProps extends BasePipelineStackProps {
  subDomain?: string;
  domainName: string;
  cloudFrontWithDomainSSL: boolean;

}

export default class SpaPipelineStack extends BasePipelineStack {
  constructor(scope: Construct, id: string, props: SpaPipelineStackProps) {
    super(scope, id, {
      description: `Pipeline, Build & Deploy to S3 bucket for ${props.appName}-${props.appEnvironment} SPA Application`,
      ...props,
    });

    const { appName = id, appEnvironment } = props;
    const {
      subDomain = isProduction(appEnvironment)
        ? appName
        : this.conventions.eqn("dash"),
      domainName,
      cloudFrontWithDomainSSL,
    } = props;

    const bucketWebsite = new Bucket(this, "siteBucket", {
      bucketName: `${appName.toLowerCase() + appEnvironment.toLowerCase()}`, // i dont think subDomain should be set to the app name and environment. best to stick with www api prod test stag. Then name the bucket after the app and the environment
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

    if (cloudFrontWithDomainSSL == true) {
      new CloudFrontDomainSSL(this, 'CloudfrontSetup', {
        subDomain: subDomain,
        domainName: domainName,
        bucket: bucketWebsite,
      });
    }

    new CfnOutput(this, 'SPA Site', {
      value: 'https://' + subDomain + "." + domainName,
      description: `Project URL for ${this.conventions.eqn("dash")}`,
    });

    new CfnOutput(this, `${this.conventions.eqn("camel")}URL`, {
      value: bucketWebsite.bucketWebsiteUrl,
      description: "URL for Website",
    });
  }
}
