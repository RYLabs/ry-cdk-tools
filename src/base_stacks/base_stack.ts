import { Stack, StackProps, Construct } from "@aws-cdk/core";
import Conventions from "../constructs/conventions";

export interface BaseStackProps extends StackProps {
  appEnv: {
    appName: string;
    appEnvironment: string;
    orgName: string;
    author: string;
  }
}

export default class BaseStack extends Stack {
  conventions: Conventions;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);
    
    const { appEnv } = props;
    
    const conventions = new Conventions(appEnv);
    conventions.tag(this);
    this.conventions = conventions;
  }
}
