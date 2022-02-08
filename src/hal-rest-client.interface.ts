import "reflect-metadata";
import { AxiosDefaults, AxiosInterceptorManager } from "axios";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { IJSONParser } from "./hal-json-parser";
import { IHalResourceConstructor, IHalResource } from "./hal-resource.interface";

export interface IHalRestClient {
  //#region read-only properties ----------------------------------------------
  /**
   * Get axios config for customization
   *
   * @return {AxiosDefaults}
   */
  readonly config: AxiosDefaults<any>;

  /**
   * get axios request interceptor
   * @return {AxiosInterceptorManager}
   */
  readonly requestInterceptors: AxiosInterceptorManager<AxiosRequestConfig<any>>;

  /**
   * get axions response interceptor
   * @return {AxiosInterceptorManager}
   */
  readonly responseInterceptors: AxiosInterceptorManager<AxiosResponse<any, any>>;
  //#endregion

  //#region methods -----------------------------------------------------------

  /**
   * add a header to the default configuration to the Axios Http-client
   * @param header {string} the header name
   * @param value {string} the header value
   *
   * @return {HalRestClient} this
   */
  addHeader(header: string, value: string): IHalRestClient;

  create: {
    /**
     * sends a post request to the server
     *
     * @param uri resource uri to create
     * @param data request body
     * @returns a record. If the response from the server contains a body, this will be returned. If not the response will be returned.
     */
    (uri: string, data: object): Promise<Record<string, unknown>>;
    /**
     * sends a post request to the server, which responds with a Hal-Resource
     *
     * @param uri resource uri to update
     * @param data request body send
     * @param type the type of hal resource returned by the server. If no model has been defined, you can use {HalResource}
     * @returns the requested HalResource model
     */
    <T extends IHalResource>(uri: string, data: object, type: IHalResourceConstructor<T>): Promise<T>;
  };

  delete: {
    /**
     * sends a delete request to the server
     *
     * @param uri the resource uri of the resource to delete
     * @returns a record. If the response from the server contains a body, this will be returned .If not the response will be returned.
     */
    (uri: string): Promise<Record<string, unknown>>;
    /**
     * sends a delete request to the server
     *
     * @param resource the resource to delete
     * @param type the type of hal resource returned by the server. If no model has been defined, you can use {HalResource}
     * @returns a record. If the response from the server contains a body, this will be returned .If not the response will be returned.
     */
    (resource: IHalResource): Promise<Record<string, unknown>>;
    /**
     * sends a delete request to the server
     *
     * @param uri the resource uri of the resource to delete
     * @param type the type of hal resource returned by the server. If no model has been defined, you can use {HalResource}
     * @returns the requested HalResource model
     */
    <T extends IHalResource>(uri: string, type: IHalResourceConstructor<T>): Promise<T>;
    /**
     * sends a delete request to the server
     *
     * @param resource the resource uri to delete
     * @param type the type of hal resource returned by the server. If no model has been defined, you can use HalResource
     * @returns the requested HalResource model
     */
    <T extends IHalResource>(resource: IHalResource, type: IHalResourceConstructor<T>): Promise<T>;
  };

  /**
   * sends a get request to the server
   *
   * @param uri the uri of the resource to fetch
   * @param type the type of hal resource returned by the server. If no model has been defined, you can use HalResource
   * @returns the requested HalResource model
   */
  fetch<T extends IHalResource>(uri: string, type: IHalResourceConstructor<T>): Promise<T>;

  /**
   * fetch an array by URI. Rest result can be a simple array of hal resources, or a hal resource whos first
   * property of _embedded is an array of hal resources
   *
   * @deprecated The method is not HAL compliant and will be removed in future versions
   * @param resourceURI the uri of resource to fetch
   * @param type model class to map result (array items). if you don't write your model, use HalResource class
   */
  fetchArray<T extends IHalResource>(resourceURI: string, type: IHalResourceConstructor<T>): Promise<Array<T>>;

  /**
   * set the json parser of the HalRestClient
   * @param parser the new json parser
   * @returns IHalRestclient: this
   */
  setJsonParser(parser: IJSONParser): IHalRestClient;

  update: {
    /**
     * sends a put or a patch request to the server
     * @param uri the resource url to update
     * @param data the request body to send
     * @param full Set true to send put, false to send patch. Defaults to false
     * @returns a record.If the response from the server contains a body, this will be returned.If not the response will be returned.
     */
    (uri: string, data: object, full?: boolean): Promise<Record<string, unknown>>;
    /**
     * sends a put or a patch request to the server
     * @param uri the resource url to update
     * @param data the request body to send
     * @param full Set true to send put, false to send patch. Defaults to false
     * @param type: the type of hal resource returned by the server. If no model has been defined, you can use HalResource
     * @returns the requested HalResource model
     */
    <T extends IHalResource>(url: string, data: object, full?: boolean, type?: IHalResourceConstructor<T>): Promise<T>;
  }
  //#endregion
}
