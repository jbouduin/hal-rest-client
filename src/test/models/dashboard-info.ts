import { HalResource, HalProperty } from "../..";

export class DashboardInfo extends HalResource {
  @HalProperty()
  public name;

  public getHalRestClientInfo() {
    return this.restClient.config.baseURL;
  }
}