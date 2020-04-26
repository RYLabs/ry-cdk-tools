import { App, SecretValue } from "@aws-cdk/core";
import BaseStack, { BaseStackProps } from "./base_stack";
import { Pipeline, Artifact } from "@aws-cdk/aws-codepipeline";
import {
  GitHubSourceAction,
  GitHubTrigger,
} from "@aws-cdk/aws-codepipeline-actions";

export interface BasePipelineStackProps extends BaseStackProps {
  ownerName: string;
  repoName?: string;
  branchName?: string;
  githubOAuthToken?: SecretValue;
}

export default class BasePipelineStack extends BaseStack {
  pipeline: Pipeline;
  githubRepoArtifact: Artifact;

  constructor(scope: App, id: string, props: BasePipelineStackProps) {
    super(scope, id, props);

    const {
      appName,
      repoName,
      ownerName,
      branchName = "master",
      githubOAuthToken,
    } = props;

    const secretKey = `${this.conventions.eqn("camel")}GithubOAuthToken`;
    const githubRepoOutput = new Artifact();

    const pl = new Pipeline(this, "pipeline", {
      stages: [
        {
          stageName: "Source",
          actions: [
            new GitHubSourceAction({
              actionName: "githubRepo_Source",
              repo: repoName || appName,
              owner: ownerName,
              branch: branchName,
              oauthToken:
                githubOAuthToken ||
                SecretValue.secretsManager(secretKey, { jsonField: secretKey }),
              output: githubRepoOutput,
              trigger: GitHubTrigger.WEBHOOK,
            }),
          ],
        },
      ],
    });

    this.pipeline = pl;
    this.githubRepoArtifact = githubRepoOutput;
  }
}
