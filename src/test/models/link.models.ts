import { HalProperty, HalResource } from "../..";

export class ToHalResourceModel extends HalResource {
  @HalProperty()
  public link1: HalResource;

  @HalProperty({ resourceType: HalResource})
  public link2: Array<HalResource>;

  @HalProperty()
  public link3: HalResource;
}

export class ToModelModel extends HalResource {
  @HalProperty()
  public link1: ToModelModel;

  @HalProperty({ resourceType: ToModelModel })
  public link2: Array<ToModelModel>;

  @HalProperty()
  public link3: ToModelModel;
}