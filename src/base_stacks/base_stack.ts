import { Stack, StackProps, Construct } from "@aws-cdk/core";
import Conventions from "../constructs/conventions";

export interface BaseStackProps extends StackProps {
  appName: string;
  appEnvironment: string;
}

export default class BaseStack extends Stack {
  conventions: Conventions;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);
    const { appName, appEnvironment } = props;
    const conventions = new Conventions(appName, appEnvironment);
    conventions.tag(this);
    this.conventions = conventions;
  }
}
