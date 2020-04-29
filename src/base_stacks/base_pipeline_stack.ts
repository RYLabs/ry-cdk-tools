import { App, SecretValue, RemovalPolicy } from "@aws-cdk/core";
import BaseStack, { BaseStackProps } from "./base_stack";
import { Pipeline, Artifact } from "@aws-cdk/aws-codepipeline";
import {
  GitHubSourceAction,
  GitHubTrigger,
} from "@aws-cdk/aws-codepipeline-actions";
import { Key, Alias } from "@aws-cdk/aws-kms";
import { Bucket, BucketEncryption, BlockPublicAccess } from "@aws-cdk/aws-s3";

export interface BasePipelineStackProps extends BaseStackProps {
  ownerName: string;
  repoName?: string;
  branchName?: string;
  githubOAuthToken?: SecretValue;
  artifactBucketName?: string;
}

export default class BasePipelineStack extends BaseStack {
  pipeline: Pipeline;
  githubRepoArtifact: Artifact;

  // Override the default artifacts implementation and set the bucket name
  // default removal policy to destroy
  private createArtifactsBucket(bucketName: string): Bucket {
    const encryptionKey = new Key(this, "ArtifactsBucketEncryptionKey", {
      // remove the key - there is a grace period of a few days before it's gone for good,
      // that should be enough for any emergency access to the bucket artifacts
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // here is where bucketName is required for unique names
    // too long an app name or env will cause name length error
    const artifactBucket = new Bucket(this, "ArtifactsBucket", {
      bucketName,
      encryptionKey,
      encryption: BucketEncryption.KMS,
      blockPublicAccess: new BlockPublicAccess(BlockPublicAccess.BLOCK_ALL),
      removalPolicy: RemovalPolicy.DESTROY,
    });
    // add an alias to make finding the key in the console easier
    new Alias(this, "ArtifactsBucketEncryptionKeyAlias", {
      aliasName: this.generateNameForDefaultBucketKeyAlias(),
      targetKey: encryptionKey,
      removalPolicy: RemovalPolicy.DESTROY, // destroy the alias along with the key
    });
    return artifactBucket;
  }

  private generateNameForDefaultBucketKeyAlias(): string {
    const prefix = "alias/codepipeline-";
    const maxAliasLength = 256;
    const uniqueId = this.node.uniqueId;
    // take the last 256 - (prefix length) characters of uniqueId
    const startIndex = Math.max(
      0,
      uniqueId.length - (maxAliasLength - prefix.length)
    );
    return prefix + uniqueId.substring(startIndex).toLowerCase();
  }

  constructor(scope: App, id: string, props: BasePipelineStackProps) {
    super(scope, id, props);

    const {
      appName,
      repoName,
      ownerName,
      branchName = "master",
      githubOAuthToken,

      // Use id to avoid bucket name conflicts
      artifactBucketName = `${id.toLowerCase()}-pl-artifacts`,
    } = props;

    const secretKey = `${this.conventions.eqn("camel")}GithubOAuthToken`;
    const githubRepoOutput = new Artifact();

    const pl = new Pipeline(this, "pipeline", {
      artifactBucket: this.createArtifactsBucket(artifactBucketName),
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
