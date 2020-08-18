import { App } from "@aws-cdk/core";
import { Port } from "@aws-cdk/aws-ec2";
import { Cluster } from "@aws-cdk/aws-ecs";
import BaseStack, { BaseStackProps } from "../base_stacks/base_stack";
import {
  SessionAccess,
  ssmManagedInstancePolicy,
} from "../constructs/session_access";
import { SimpleLoadBalancer } from "../constructs/simple_load_balancer";
import { SimpleCluster } from "./simple_cluster";
import { IVpcLookup, resolveVpc } from "../utils/lookups";

export interface EcsStackProps extends BaseStackProps {
  /**
   * Provide the Vpc for the RDS using a direct reference or via lookup options
   */
  readonly vpc: IVpcLookup;

  readonly description?: string;
  readonly instanceTypeIdentifier?: string;
  readonly wildcardHttpsCertificateArn?: string;
  readonly wildcardDomain?: string;
}

export class EcsStack extends BaseStack {
  readonly cluster: Cluster;
  readonly wildcardDomain?: string;

  constructor(scope: App, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const {
      vpc: vpcProp,
      instanceTypeIdentifier,
      wildcardHttpsCertificateArn,
      wildcardDomain,
    } = props;

    const vpc = resolveVpc(this, vpcProp);

    const simpleCluster = new SimpleCluster(scope, "cluster", {
      vpc,
      clusterName: this.conventions.eqn(),
      instanceManagedPolicies: [ssmManagedInstancePolicy()],
      instanceTypeIdentifier,
    });
    this.cluster = simpleCluster.cluster;

    let loadBalancer = null;
    if (wildcardDomain) {
      loadBalancer = SimpleLoadBalancer.withWildcardDomain(
        this,
        "loadBalancer",
        {
          vpc,
          conventions: this.conventions,
          certificateArn: wildcardHttpsCertificateArn,
          baseDomain: wildcardDomain,
        }
      );
    } else {
      loadBalancer = new SimpleLoadBalancer(this, "loadBalancer", {
        vpc,
        conventions: this.conventions,
      });
    }

    loadBalancer.securityGroup.connections.allowTo(
      simpleCluster.securityGroup,
      Port.allTcp()
    );

    new SessionAccess(this, "sessionAccess", {
      name: this.conventions.eqn("camel"),
      ec2InstanceTag: "aws:cloudformation:stack-name",
      ec2InstanceTagValue: this.stackName,
    });
  }
}
