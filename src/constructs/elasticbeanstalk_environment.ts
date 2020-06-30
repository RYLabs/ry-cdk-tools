import {
  CfnApplicationVersion,
  CfnEnvironment,
} from "@aws-cdk/aws-elasticbeanstalk";
import { Construct } from "@aws-cdk/core";
import { IVpc, ISecurityGroup } from "@aws-cdk/aws-ec2";
import { Role, IRole, CfnRole } from "@aws-cdk/aws-iam";

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

function isRole(role: Role | IRole | string): role is Role {
  return (role as Role).node !== undefined;
}

export interface ElasticbeanstalkEnvironmentProps {
  applicationName: string;
  environmentName: string;
  vpc: IVpc;
  securityGroup: ISecurityGroup;
  ec2KeyName?: string;
  applicationVersion: CfnApplicationVersion;
  ec2InstanceTypes?: string[];
  solutionStackName: string;
  rootVolumeType?: string;
  rootVolumeSize?: number;
  iamInstanceProfile?: string | IRole;
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
    } = props;

    let _iamInstanceProfile;
    if (typeof iamInstanceProfile === "string") {
      _iamInstanceProfile = iamInstanceProfile;
    } else {
      _iamInstanceProfile = iamInstanceProfile.roleName;
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
    if (isRole(iamInstanceProfile)) {
      this.addDependsOn(iamInstanceProfile.node.defaultChild as CfnRole);
    }
    this.environmentName = environmentName;
  }
}
