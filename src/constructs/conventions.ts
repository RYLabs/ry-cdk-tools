import { Construct, Tag } from "@aws-cdk/core";

export type EQNFormat = "dash" | "camel" | "underscore" | "path";

export default class Conventions {
  appEnv: any;

  constructor(appEnv: any) {
    this.appEnv = appEnv;
  }

  // environment qualified name (TM)
  eqn(format: EQNFormat = "dash") {
    if (format === "camel") {
      return [
        this.appEnv.appName,
        this.appEnv.appEnvironment[0].toUpperCase(),
        this.appEnv.appEnvironment.substring(1),
      ].join("");
    } else if (format === "underscore") {
      return [this.appEnv.appName, this.appEnv.appEnvironment].join("_");
    } else if (format === "path") {
      return [this.appEnv.appName, this.appEnv.appEnvironment].join("/");
    }
    return [this.appEnv.appName, this.appEnv.appEnvironment].join("-");
  }

  tag(construct: Construct) {
    Tag.add(construct, "rylabs:app-name", this.appEnv.appName);
    Tag.add(construct, "rylabs:app-environment", this.appEnv.appEnvironment);
    Tag.add(construct, "rylabs:org-name", this.appEnv.orgName);
    Tag.add(construct, "rylabs:author", this.appEnv.author);
  }
}
