import { Stack, StackProps, Construct } from "@aws-cdk/core";
import Conventions from "../utils/conventions";
import { AppInfo } from "../utils/app_info";

export interface BaseStackProps extends StackProps {
  appInfo: AppInfo
}

export default class BaseStack extends Stack {
  conventions: Conventions;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);
    
    const { appInfo } = props;
    
    const conventions = new Conventions(appInfo);
    conventions.tag(this);
    this.conventions = conventions;
  }
}
