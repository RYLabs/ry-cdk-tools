import { Construct, Tag } from "@aws-cdk/core";

export type EQNFormat = "dash" | "camel" | "underscore" | "path";

export default class Conventions {
  appName: string;
  appEnvironment: string;

  constructor(appName: string, appEnvironment: string) {
    this.appName = appName;
    this.appEnvironment = appEnvironment;
  }

  // environment qualified name (TM)
  eqn(format: EQNFormat = "dash") {
    if (format === "camel") {
      return [
        this.appName,
        this.appEnvironment[0].toUpperCase(),
        this.appEnvironment.substring(1),
      ].join("");
    } else if (format === "underscore") {
      return [this.appName, this.appEnvironment].join("_");
    } else if (format === "path") {
      return [this.appName, this.appEnvironment].join("/");
    }
    return [this.appName, this.appEnvironment].join("-");
  }

  tag(construct: Construct) {
    Tag.add(construct, "rylabs:author", "rylabs");
    Tag.add(construct, "rylabs:app-environment", this.appEnvironment);
  }
}
