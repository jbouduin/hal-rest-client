import { IHalResource } from "./hal-resource.interface";

export interface IJSONSerializer {
  /**
   * parse a prop value to server comprehensible value
   */
  parseProp(value: any);
  /**
   * parse a hal-resource to server comprehensible value
   */
  parseResource(value: IHalResource);
}

/**
 * convert a resource to json
 * for prop simply do a toString
 * for link simply get uri
 */
export class DefaultSerializer implements IJSONSerializer {

  /**
   * parse a prop value to server comprehensible value
   */
  public parseProp(value: any) {
    return value === null ? undefined : value;
  }

  /**
   * parse a hal-resource to server comprehensible value
   */
  public parseResource(value: IHalResource) {
    return value ? value.uri.uri : undefined;
  }
}
