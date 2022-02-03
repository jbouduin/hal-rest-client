import { HalProperty, HalResource } from "../..";

export class ToHalResourceModel extends HalResource {
  @HalProperty()
  public link1: HalResource;

  @HalProperty({ targetType: HalResource})
  public link2: Array<HalResource>;

  @HalProperty()
  public link3: HalResource;
}

export class ToModelModel extends HalResource {
  @HalProperty()
  public link1: ToModelModel;

  @HalProperty({ targetType: ToModelModel })
  public link2: Array<ToModelModel>;

  @HalProperty()
  public link3: ToModelModel;
}