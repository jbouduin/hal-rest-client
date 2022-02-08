import { IJSONSerializer } from "./hal-json-serializer";
import { IHalRestClient } from "./hal-rest-client.interface";
import { URI } from "./uri";

export interface IHalResource {
  readonly isLoaded: boolean;
  readonly uri: URI;
  readonly restClient: IHalRestClient;

  /**
   * returns true if the resources has changed properties or links
   */
  readonly hasChanges: boolean;

  /**
   * fetch the current resource
   *
   * @param forceOrParams: if uri is a templated link you can use object to set template parameters
   *                        in this case fetch is already done
   *                       if uri is non a template link you can use true to force fetch to be done (refersh resource)
   */
  fetch(forceOrParams?: boolean | object): Promise<this>;

  /**
   * reset the object
   * must clean all props and all links for this object
   * this is used when the cached object will be refreshed
   */
  reset(): void;

  /**
   * get or set a prop or a link.
   * if name is a link. link function is used
   * @param name : the prop/link name
   * @param value : the value to set. Use null to clear value not undefined
   */
  // prop(name: string, value?: any): any;
  setProp(name: string, value?: unknown): void;
  getProp<T>(name: string): T;
  /**
   * get or set a link.
   * @param name : the link name
   * @param value : the new resource. If you want reset a link use null and not undefined
   */
  // link(name: string, value?: IHalResource | Array<IHalResource>): IHalResource | Array<IHalResource>
  setLink(name: string, value?: IHalResource | Array<IHalResource>): void;
  getLink<T = IHalResource | Array<IHalResource>>(name: string): T;
  /**
   * function called when object is populated
   */

  update<T extends IHalResource>(type?: IHalResourceConstructor<T>, serializer?: IJSONSerializer): Promise<T | Record<string, any>>

  onInitEnded();
}

export interface IHalResourceConstructor<T extends IHalResource> {
  new (restClient: IHalRestClient, uri ?: URI): T;
}

export interface INewable {
  new(): object;
}


