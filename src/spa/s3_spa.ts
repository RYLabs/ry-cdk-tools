import { Construct, RemovalPolicy } from "@aws-cdk/core";
import { Bucket } from "@aws-cdk/aws-s3";

export interface S3SpaProps {
  bucketName: string;
}

// Single page application using S3
export default class S3Spa extends Construct {
  bucket: Bucket;

  get websiteUrl(): string {
    return this.bucket.bucketWebsiteUrl;
  }

  // Construct needed to be passed for the creation of resources.
  constructor(scope: Construct, id: string, props: S3SpaProps) {
    super(scope, id);

    const { bucketName } = props;

    this.bucket = new Bucket(this, "siteBucket", {
      bucketName,
      websiteIndexDocument: "index.html",

      // re-render the index doc to support pushState
      websiteErrorDocument: "index.html",

      publicReadAccess: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
