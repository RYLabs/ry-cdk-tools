export interface AppInfo {
  /**
   * Application name
   */
  name: string;
  /**
   * Application environment (e.g. staging, prod, develop)
   */
  environment: string;
  /**
   * Organization that constructed this app/stack
   */
  orgName: string;
  /**
   * Author that constructed this app/stack
   */
  author: string;
}
