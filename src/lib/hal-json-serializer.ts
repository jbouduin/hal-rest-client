import { IJSONSerializer } from "./hal-json-serializer.interface";
import { IHalResource } from "./hal-resource.interface";

/**
 * convert a resource to json
 * for prop simply do a toString
 * for link simply get uri
 */
export class DefaultSerializer implements IJSONSerializer {

  /**
   * parse a prop value to to a server-comprehensible value
   *
   * @param {IHalResource} value - the value to serialize
   * @returns {unknown} - a server-comprehensible value
   */
  public parseProp(value: any): unknown {
    return value === null ? undefined : value;
  }

  /**
   * parse a hal-resource to a server-comprehensible value
   *
   * @param {IHalResource} value - the value to serialize
   * @returns {unknown} - a server-comprehensible value
   */
  public parseResource(value: IHalResource): unknown {
    return value ? value.uri.resourceUri : undefined;
  }
}
