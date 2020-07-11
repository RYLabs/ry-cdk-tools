import {
  CfnApplicationVersion,
  CfnEnvironment,
} from "@aws-cdk/aws-elasticbeanstalk";
import { Construct } from "@aws-cdk/core";
import { IVpc, ISecurityGroup } from "@aws-cdk/aws-ec2";
import { CfnInstanceProfile } from "@aws-cdk/aws-iam";

function optionalSetting(
  setting?: CfnEnvironment.OptionSettingProperty
): CfnEnvironment.OptionSettingProperty[] {
  if (setting) {
    return [setting];
  } else {
    return [];
  }
}

function ec2KeyNameSetting(
  ec2KeyName?: string
): CfnEnvironment.OptionSettingProperty[] {
  return optionalSetting(
    ec2KeyName
      ? {
          namespace: "aws:autoscaling:launchconfiguration",
          optionName: "EC2KeyName",
          value: ec2KeyName,
        }
      : undefined
  );
}

function rootVolumeTypeSetting(
  rootVolumeType?: string
): CfnEnvironment.OptionSettingProperty[] {
  return optionalSetting(
    rootVolumeType
      ? {
          namespace: "aws:autoscaling:launchconfiguration",
          optionName: "RootVolumeType",
          value: rootVolumeType,
        }
      : undefined
  );
}

function rootVolumeSizeSetting(
  rootVolumeSize?: number
): CfnEnvironment.OptionSettingProperty[] {
  return optionalSetting(
    rootVolumeSize
      ? {
          namespace: "aws:autoscaling:launchconfiguration",
          optionName: "RootVolumeSize",
          value: rootVolumeSize.toString(),
        }
      : undefined
  );
}

function ec2InstanceTypesSetting(
  ec2InstanceTypes?: string[]
): CfnEnvironment.OptionSettingProperty[] {
  return optionalSetting(
    ec2InstanceTypes
      ? {
          namespace: "aws:ec2:instances",
          optionName: "InstanceTypes",
          value: ec2InstanceTypes.join(","),
        }
      : undefined
  );
}

function environmentVariableSettings(
  envvars?: [EBEnvironmentVariable]
): CfnEnvironment.OptionSettingProperty[] {
  return (
    envvars?.map(
      (v) =>
        ({
          namespace: "aws:elasticbeanstalk:application:environment",
          optionName: v.name,
          value: v.value,
        } as CfnEnvironment.OptionSettingProperty)
    ) || []
  );
}

function isInstanceProfile(
  profile: CfnInstanceProfile | string
): profile is CfnInstanceProfile {
  return (profile as CfnInstanceProfile).node !== undefined;
}

export interface EBEnvironmentVariable {
  readonly name: String;
  readonly value: String;
}

export interface ElasticbeanstalkEnvironmentProps {
  readonly applicationName: string;
  readonly environmentName: string;
  readonly vpc: IVpc;
  readonly securityGroup: ISecurityGroup;
  readonly ec2KeyName?: string;
  readonly applicationVersion: CfnApplicationVersion;
  readonly ec2InstanceTypes?: string[];
  readonly solutionStackName: string;
  readonly rootVolumeType?: string;
  readonly rootVolumeSize?: number;
  readonly iamInstanceProfile?: string | CfnInstanceProfile;
  readonly environmentVariables?: EBEnvironmentVariable[];
}

export class ElasticbeanstalkEnvironment extends CfnEnvironment {
  constructor(
    scope: Construct,
    id: string,
    props: ElasticbeanstalkEnvironmentProps
  ) {
    const {
      environmentName,
      applicationName,
      vpc,
      securityGroup,
      ec2KeyName,
      applicationVersion,
      ec2InstanceTypes,
      solutionStackName,
      rootVolumeType,
      rootVolumeSize,
      iamInstanceProfile = "aws-elasticbeanstalk-ec2-role",
      environmentVariables,
    } = props;

    let _iamInstanceProfile;
    if (typeof iamInstanceProfile === "string") {
      _iamInstanceProfile = iamInstanceProfile;
    } else {
      _iamInstanceProfile = iamInstanceProfile.instanceProfileName;
    }

    // TODO: Fix tags not propagating to resources created by EB
    super(scope, id, {
      applicationName,
      environmentName,

      // TODO: need to check that necessary EB roles exists

      // #Reference: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general.html
      optionSettings: [
        ...ec2KeyNameSetting(ec2KeyName),
        ...rootVolumeTypeSetting(rootVolumeType),
        ...rootVolumeSizeSetting(rootVolumeSize),
        ...ec2InstanceTypesSetting(ec2InstanceTypes),
        ...environmentVariableSettings(environmentVariables),
        {
          namespace: "aws:autoscaling:launchconfiguration",
          optionName: "SecurityGroups",
          value: securityGroup.securityGroupId,
        },
        {
          namespace: "aws:autoscaling:launchconfiguration",
          optionName: "IamInstanceProfile",
          value: _iamInstanceProfile,
        },
        {
          namespace: "aws:elasticbeanstalk:healthreporting:system",
          optionName: "SystemType",
          value: "enhanced", // requires the AWSElasticBeanstalkEnhancedHealth role
        },
        {
          namespace: "aws:ec2:vpc",
          optionName: "VPCId",
          value: vpc.vpcId,
        },
        {
          namespace: "aws:ec2:vpc",
          optionName: "Subnets",
          value: vpc.privateSubnets.map((s) => s.subnetId).join(","),
        },
        {
          namespace: "aws:ec2:vpc",
          optionName: "ELBSubnets",
          value: vpc.publicSubnets.map((s) => s.subnetId).join(","),
        },
        {
          namespace: "aws:elasticbeanstalk:environment",
          optionName: "LoadBalancerType",
          value: "application",
        },
        {
          namespace: "aws:elasticbeanstalk:command",
          optionName: "DeploymentPolicy",
          value: "Rolling",
        },
      ],
      versionLabel: applicationVersion.ref,
      solutionStackName,
    });
    this.addDependsOn(applicationVersion);
    if (isInstanceProfile(iamInstanceProfile))
      this.addDependsOn(iamInstanceProfile);
    this.environmentName = environmentName;
  }
}
