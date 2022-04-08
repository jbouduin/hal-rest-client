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
   * @returns {AxiosDefaults}
   */
  readonly config: AxiosDefaults<any>;

  /**
   * get axios request interceptor
   *
   * @returns {AxiosInterceptorManager}
   */
  readonly requestInterceptors: AxiosInterceptorManager<AxiosRequestConfig<any>>;

  /**
   * get axions response interceptor
   *
   * @returns {AxiosInterceptorManager}
   */
  readonly responseInterceptors: AxiosInterceptorManager<AxiosResponse<any, any>>;
  //#endregion

  //#region methods -----------------------------------------------------------

  /**
   * add a header to the default configuration to the Axios Http-client
   *
   * @param {string} header - the header name
   * @param {string} value - the header value
   * @returns {IHalRestClient} - this
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
    (uri: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
    /**
     * sends a post request to the server, which responds with a Hal-Resource
     *
     * @param uri resource uri to update
     * @param data request body send
     * @param type the type of hal resource returned by the server. If no model has been defined, you can use {HalResource}
     * @returns the requested HalResource model
     */
    <T extends IHalResource>(uri: string, data: Record<string, unknown>, type: IHalResourceConstructor<T>): Promise<T>;
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
   * @template T - a resource type extending {IHalResource}
   * @param {string} uri - the relative or absolute resource url to update
   * @param {IHalResourceConstructor<T>} type - the type of hal resource returned by the server. If no model has been defined, you can use HalResource
   * @returns {T} - the requested HalResource model
   */
  fetch<T extends IHalResource>(uri: string, type: IHalResourceConstructor<T>): Promise<T>;

  /**
   * fetch an array by URI. Rest result can be a simple array of hal resources, or a hal resource whos first
   * property of _embedded is an array of hal resources
   *
   * @deprecated - The method is not HAL compliant and will be removed in future versions
   * @template T - a resource type extending {IHalResource}
   * @param {string} uri - the relative or absolute resource url to update
   * @param {IHalResourceConstructor<T>} type - the type of hal resource returned by the server. If no model has been defined, you can use HalResource
   * @returns {Array<T>} - an array containing models of the requested type
   */
  fetchArray<T extends IHalResource>(uri: string, type: IHalResourceConstructor<T>): Promise<Array<T>>;

  /**
   * Remove this instance of HalRestClient from cache
   */
  removeFromCache(): boolean;

  /**
   * set the json parser of the HalRestClient
   *
   * @param {IJSONParser} parser - the json parser that will convert server responses into HalResources
   * @returns IHalRestclient: this
   */
  setJsonParser(parser: IJSONParser): IHalRestClient;

  update: {
    /**
     * sends a put or a patch request to the server, expecting a non hal-json answer back.
     *
     * @param {string} uri - the relative or absolute resource url to update
     * @param {Record<string, unknown>} data - the request body to send
     * @param {boolean} full - Set true to send a put request, false to send a patch request. Defaults to false.
     * @returns {Record} - if the response from the server contains a body, this will be returned.If not the response will be returned.
     */
    (uri: string, data: Record<string, unknown>, full?: boolean): Promise<Record<string, unknown>>;
    /**
     * sends a put or a patch request to the server, expecting a hal-json answer back.
     *
     * @template T - a resource type extending {IHalResource}
     * @param {string} uri - the relative or absolute resource url to update
     * @param {Record<string, unknown>} data - the request body to send
     * @param {boolean} full - Set true to send a put request, false to send a patch request. Defaults to false.
     * @param {IHalResourceConstructor<T>} type - the type of hal resource returned by the server. If no model has been defined, you can use HalResource
     * @returns {T} - the requested HalResource model
     */
    <T extends IHalResource>(url: string, data: Record<string, unknown>, full?: boolean, type?: IHalResourceConstructor<T>): Promise<T>;
  }
  //#endregion
}
