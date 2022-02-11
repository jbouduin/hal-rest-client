import { SimpleModel } from "./simple.model";
import { HalResource, HalProperty } from "../..";

export class SimpleListModel extends HalResource {
  @HalProperty()
  public count: number;

  @HalProperty()
  public sort: string;

  @HalProperty()
  public offset: number;

  @HalProperty()
  public pageSize: number;

  @HalProperty({ resourceType: SimpleModel })
  public results: Array<SimpleModel>;

  @HalProperty()
  public jumpTo: SimpleListModel;
}
