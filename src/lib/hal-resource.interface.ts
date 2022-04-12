import { IJSONSerializer } from "./hal-json-serializer.interface";
import { IHalRestClient } from "./hal-rest-client.interface";
import { IUriData, UriData } from "./uri-data";
import { TemplateFillParameters } from "./uri-template";

export interface IHalResource {

  //#region readoly properties ------------------------------------------------
  /**
   * indicates whether the resource is loaded or not
   */
  readonly isLoaded: boolean;

  /**
   * @type {IUriData} - the uri of the resource
   */
  readonly uri: IUriData;

  /**
   * @type {IHalRestClient} - the hal-rest client
   */
  readonly restClient: IHalRestClient;

  /**
   * @type {boolean} - true if the resources has changed properties and/or links
   */
  readonly hasChanges: boolean;

  /**
   * @type {Array<string>} - names of all properties (embedded and non-embedded)
   */
  readonly propertyKeys: Array<string>;

  /**
   * @type {Array<string>} - names of all links, the self link excluded
   */
  readonly linkKeys: Array<string>;
  //#endregion

  //#region property and link methods -----------------------------------------
  /**
   * set a property or a link.
   *
   * @param name : the prop/link name
   * @param value : the value to set.
   */
  setProperty(name: string, value?: unknown): void;

  /**
   * get a property or link value
   *
   * @param name the property/link name
   */
  getProperty<T>(name: string): T;

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
   * @template T - an IHalResource or an array of them
   * @param name - the prop/link name
   * @param value - the value to set.
   */
  getLink<T = IHalResource | Array<IHalResource>>(name: string): T;
  //#endregion

  //#region server calls ------------------------------------------------------
  /**
   * sends a get request to the server
   *
   * @param {IResourceFetchOptions} options - the options when fetching. See {@link IResourceFetchOptions}.
   * @returns the fetched or refetched resource
   */
  fetch(options?: IResourceFetchOptions): Promise<this>;

  /**
   * send a patch request to the server
   *
   * @param type - the type of resource that will be send back from the server. Use HalResource if no model exists,
   * use undefined if the server does not return a hal+json response
   * @param serializer - a IJSONSerializer to build the body of the post requests
   * @returns - a HalResource of the requested type or, if available, the body of the server response, otherwise the response
   */
  update<T extends IHalResource>(type?: IHalResourceConstructor<T>, serializer?: IJSONSerializer): Promise<T | Record<string, any>>;

  /**
   * send a post request to the server
   *
   * @param type - the type of resource that will be send back from the server. Use HalResource if no model exists,
   * use undefined if the server does not return a hal+json response
   * @param serializer a IJSONSerializer to build the body of the post requests
   * @returns - a HalResource of the requested type or, if available, the body of the server response, otherwise the response
   */
  create<T extends IHalResource>(type?: IHalResourceConstructor<T>, serializer?: IJSONSerializer): Promise<T | Record<string, any>>;

  /**
   * send a delete request to the server
   *
   * @param type - the type of resource that will be send back from the server. Use HalResource if no model exists,
   * use undefined if the server does not return a hal+json response
   * @returns - a HalResource of the requested type or, if available, the body of the server response, otherwise the response
   */
  delete<T extends IHalResource>(type?: IHalResourceConstructor<T>): Promise<T | Record<string, any>>;
  //#endregion

  //#region utility methdods --------------------------------------------------
  /**
   * Converts the Halresource to another type, taking all properties and links with it. Even those which are not part of the target type
   *
   * @param type the target HalResource type
   */
  convert<N extends IHalResource>(type: IHalResourceConstructor<N>): N

  /**
   * removes the current Resource from the cache
   *
   * @returns true if it has been removed, false if it was not in the cache
   */
  removeFromCache(): boolean;
  //#endregion

  //#region internal methods --------------------------------------------------
  /** @internal */
  reset(): void;

  /** @internal */
  setUri(uri: UriData): void;

  /** @internal */
  onInitEnded(): void

  /** @internal */
  setLoaded(): void;
  //#endregion
}

export interface IHalResourceConstructor<T extends IHalResource> {
  new (restClient: IHalRestClient, uri ?: UriData): T;
}

export interface INewable {
  new(): object;
}

/**
 * The options for calling the fetch method on a resource
 */
export type IResourceFetchOptions = {
  /**
   * @type {boolean=} - Force fetching, even if the resource has been fetched before
   */
  force?: boolean;
  /**
   * @type {TemplateFillParameters=} - The object containing the query parameters for a templated resource URI.
   */
  params?: TemplateFillParameters;
}


