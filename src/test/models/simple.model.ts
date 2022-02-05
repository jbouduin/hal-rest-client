import { HalResource, HalProperty } from "../..";

export class SimpleModel extends HalResource {
  @HalProperty()
  public id: number;

  @HalProperty()
  public name: string;
}
