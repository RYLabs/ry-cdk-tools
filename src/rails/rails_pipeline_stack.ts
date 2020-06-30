import {
  ElasticbeanstalkPipelineStack,
  ElasticbeanstalkPipelineStackProps,
} from "../codepipeline/elasticbeanstalk_pipeline_stack";

export interface RailsPipelineStackProps
  extends ElasticbeanstalkPipelineStackProps {}

export class RailsPipelineStack extends ElasticbeanstalkPipelineStack {}
