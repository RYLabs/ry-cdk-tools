import { Construct } from "@aws-cdk/core";
import { Group, PolicyStatement, Effect, Policy } from "@aws-cdk/aws-iam";

export interface SessionAccessProps {
  name?: string;
  ec2InstanceTag: string;
  ec2InstanceTagValue: string;
}

export class SessionAccess extends Construct {
  constructor(scope: Construct, id: string, props: SessionAccessProps) {
    super(scope, id);

    const { name = id, ec2InstanceTag, ec2InstanceTagValue } = props;

    const group = new Group(this, "group", {
      groupName: `${name}SessionGroup`,
    });

    const tagCondition = { StringLike: {} } as any;
    tagCondition.StringLike[
      `ssm:resourceTag/${ec2InstanceTag}`
    ] = ec2InstanceTagValue;

    new Policy(this, "sessionAccessPolicy", {
      groups: [group],
      policyName: `${name}SessionAccessPolicy`,
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          sid: `${name}AllowSessionManager`,
          actions: ["ssm:StartSession"],
          resources: ["arn:aws:ec2:*:*:instance/*"],
          conditions: tagCondition,
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          sid: `${name}OnlyAllowTerminateSelfOwnedSessions`,
          actions: ["ssm:TerminateSession"],
          resources: ["arn:aws:ssm:*:*:session/${aws:username}-*"],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          sid: `${name}DescribeInstances`,
          actions: ["ec2:DescribeInstances"],
          resources: ["*"], // unfortunately you can't further constrain the ec2:DescribeInstances action
        }),
      ],
    });
  }
}
