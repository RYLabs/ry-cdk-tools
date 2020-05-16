import { Construct, SecretValue, RemovalPolicy } from "@aws-cdk/core";
import { Pipeline, Artifact } from "@aws-cdk/aws-codepipeline";
import { Alias, Key } from "@aws-cdk/aws-kms";
import { BucketEncryption, BlockPublicAccess, Bucket } from "@aws-cdk/aws-s3";
import { Secret } from '@aws-cdk/aws-secretsmanager';
import {
  GitHubSourceAction,
  GitHubTrigger,
} from "@aws-cdk/aws-codepipeline-actions";
import _ = require("lodash");

// /**
//  * Create a Keys type that declares its type
//  */
// type Keys<T> = keyof T;
// function Keys<T>(o: T) {
//   if (!o) {
//     return [];
//   }
//   return Object.keys(o) as Keys<T>[];
// }
// /**
//  * Refractored code to make OneOf less smelly
//  */
// type EachOfTmp<T> = {
//   [K in Keys<T>]: {
//     _: { [X in K]: T[K] };
//   };
// };
// /**
//  * When parameters are confitional but one must be used
//  * This type should be used.
//  * const thing1: OneOf<{ a: number; b: number }> = { a: 2 } // valid
//  * const thing2: OneOf<{ a: number; b: number }> = { b: 2 } // valid
//  * const thing3: OneOf<{ a: number; b: number }> = {} // invalid
//  */
// type OneOf<T> = EachOfTmp<T>[Keys<T>]["_"] & Partial<T>;
type KeySource = string | SecretValue;

export interface GithubSourcePipelineProps {
  ownerName: string;
  repoName: string;
  /**
   * Default branch is master.
   */
  branchName?: string;
  /**
   * User can pass a githubOAuthToken as a secret value
   * or pass a string and have the secretsmanager
   * search for the key
   */
  githubOAuthToken: KeySource;
  // githubAuth: OneOf<{ githubOAuthToken: SecretValue; secretKey: string }>;
  bucketName: string;
}

export default class GithubSourcePipeline extends Construct {
  /**
   * Access the Github Source pipeline created
   * to add further stages.
   */
  pipeline: Pipeline;
  /**
   * If a build stages requires the source code
   * Artifact
   */
  githubRepoArtifact: Artifact;

  /**
   * Override the default artifacts implementation and
   * set the bucket name default removal policy to destroy
   */
  private createArtifactsBucket(bucketName: string): Bucket {
    const encryptionKey = new Key(this, "ArtifactsBucketEncryptionKey", {
      /**
       * remove the key - there is a grace period of a few days before it's gone for good,
       * that should be enough for any emergency access to the bucket artifacts
       */
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const artifactBucket = new Bucket(this, "ArtifactsBucket", {
      bucketName: `${bucketName}-pl-artifacts`,
      encryptionKey,
      encryption: BucketEncryption.KMS,
      blockPublicAccess: new BlockPublicAccess(BlockPublicAccess.BLOCK_ALL),
      removalPolicy: RemovalPolicy.DESTROY,
    });

    /**
     * Add an alias to make finding the key in the console easier
     */
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
    /**
     * take the last 256 - (prefix length) characters of uniqueId
     */
    const startIndex = Math.max(
      0,
      uniqueId.length - (maxAliasLength - prefix.length)
    );
    return prefix + uniqueId.substring(startIndex).toLowerCase();
  }
  /**
   * Check if the user provided a string or SecretValue
   * @param source
   */
  private checkTypeOfAuth(source: KeySource) {
    if (source instanceof SecretValue) {
      return source;
    } else {
      return SecretValue.secretsManager(source, { jsonField: source });
    }
  };
  
  constructor(scope: Construct, id: string, props: GithubSourcePipelineProps) {
    super(scope, id);

    const {
      repoName,
      ownerName,
      branchName = "master",
      githubOAuthToken,
      // githubAuth,
      bucketName,
    } = props;

    const githubRepoOutput = new Artifact();

    const pl = new Pipeline(this, "pipeline", {
      artifactBucket: this.createArtifactsBucket(bucketName),
      stages: [
        {
          stageName: "Source",
          actions: [
            new GitHubSourceAction({
              actionName: "githubRepo_Source",
              repo: repoName,
              owner: ownerName,
              branch: branchName,
              // oauthToken: this.checkTypeOfAuth(githubAuth),
              oauthToken: this.checkTypeOfAuth(githubOAuthToken),
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
