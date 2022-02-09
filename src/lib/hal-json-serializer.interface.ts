import { IHalResource } from "./hal-resource.interface";

export interface IJSONSerializer {
  /**
   * parse any prop value to server comprehensible value
   */
  parseProp(value: any): unknown;
  /**
   * parse any hal-resource to server comprehensible value
   */
  parseResource(value: IHalResource): unknown;
}

