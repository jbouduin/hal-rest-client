import { HalProperty, HalResource } from "../..";

export class Cyclical extends HalResource {
  @HalProperty()
  public property: string;
}

export class CyclicalList extends HalResource {
  @HalProperty({ targetType: Cyclical })
  public cyclicals: Array<Cyclical>;

  @HalProperty()
  public refresh: CyclicalList;
}
