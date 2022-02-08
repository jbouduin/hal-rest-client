import { IJSONSerializer } from "./hal-json-serializer.interface";
import { IHalRestClient } from "./hal-rest-client.interface";
import { URI } from "./uri";

export interface IHalResource {

  /**
   * indicates whether the resource is loaded or not
   */
  readonly isLoaded: boolean;

  /**
   * the uri of the resource
   */
  readonly uri: URI;

  /**
   * the hal-rest client
   */
  readonly restClient: IHalRestClient;

  /**
   * returns true if the resources has changed properties and/or links
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
   * reset the resource
   * deletes (!) all the properties and links from the resource
   * this is used when the cached object will be refreshed
   */
  reset(): void;

  /**
   * set a property or a link.
   *
   * @param name : the prop/link name
   * @param value : the value to set.
   */
  setProp(name: string, value?: unknown): void;

  /**
   * get a property or link value
   * @param name the property/link name
   */
  getProp<T>(name: string): T;

  /**
   * set a link.
   *
   * @param name : the prop/link name
   * @param value : the value to set.
   */
  setLink(name: string, value?: IHalResource | Array<IHalResource>): void;

  /**
   * get a link
   *
   * @param name : the prop/link name
   * @param value : the value to set.
   */
  getLink<T = IHalResource | Array<IHalResource>>(name: string): T;

  update<T extends IHalResource>(type?: IHalResourceConstructor<T>, serializer?: IJSONSerializer): Promise<T | Record<string, any>>

  /**
   * Converts the Halresource to another type, taking all properties and links with it
   * @param type
   */
  convert<N extends IHalResource>(type: IHalResourceConstructor<N>): N

}

export interface IHalResourceConstructor<T extends IHalResource> {
  new (restClient: IHalRestClient, uri ?: URI): T;
}

export interface INewable {
  new(): object;
}


