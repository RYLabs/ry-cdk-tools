import {
  IApplicationListener,
  HealthCheck,
} from "@aws-cdk/aws-elasticloadbalancingv2";
import { Protocol, BaseService } from "@aws-cdk/aws-ecs";

export interface ServiceOptions {
  readonly priority?: number;
  readonly healthCheck?: HealthCheck;
  readonly targetGroupName?: string;
  readonly hostHeader: string;
}

export function registerServiceToListeners(
  service: BaseService,
  listeners: IApplicationListener[],
  options: ServiceOptions
) {
  let container = service.taskDefinition.defaultContainer;
  if (!container || !container.portMappings.length) {
    throw new Error("Default container doesn't have port mapping");
  }

  const { containerName, containerPort } = container;
  const { priority = 100, hostHeader, healthCheck, targetGroupName } = options;

  listeners.forEach((listener) => {
    listener.addTargets(`targetGroup${containerName}${containerPort}`, {
      targetGroupName,
      port: 80,
      hostHeader,
      priority,
      healthCheck,
      targets: [
        service.loadBalancerTarget({
          containerName,
          containerPort,
          protocol: Protocol.TCP,
        }),
      ],
    });
  });
}
