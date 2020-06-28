import { Construct, Tag } from "@aws-cdk/core";
import { AppInfo } from "./app_info";

/**
 * Different EQN formatted strings
 */
export type EQNFormat = "dash" | "camel" | "underscore" | "path";

export default class Conventions {
  appInfo: AppInfo;

  constructor(appInfo: AppInfo) {
    this.appInfo = appInfo;
  }

  /**
   * Environment qualified name (TM). Convenience method for generating
   * consistent names when constructing AWS constructs. This method supports
   * different formats to play nicely with different naming constraints.
   */
  eqn(format: EQNFormat = "dash") {
    const { name, environment } = this.appInfo;
    if (format === "camel") {
      return [
        name,
        environment[0].toUpperCase(),
        environment.substring(1),
      ].join("");
    } else if (format === "underscore") {
      return [name, environment].join("_");
    } else if (format === "path") {
      return [name, environment].join("/");
    }
    return [name, environment].join("-");
  }

  tag(construct: Construct) {
    const { name, environment, orgName, author } = this.appInfo;
    Tag.add(construct, "rylabs:app-name", name);
    Tag.add(construct, "rylabs:app-environment", environment);
    Tag.add(construct, "rylabs:org-name", orgName);
    Tag.add(construct, "rylabs:author", author);
  }
}
