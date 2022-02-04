import "reflect-metadata";
import Axios, { AxiosDefaults, AxiosInterceptorManager } from "axios";
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { IJSONParser, JSONParser } from "./hal-json-parser";
import { IHalResource, IHalResourceConstructor } from "./hal-resource-interface";

// TODO 1659 Appropriate Encapsulation
// create IHalRestClient Interface
// hide that internal method

/**
 * The Hal-Rest client
 */
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
   * add header configuration
   * @param header {string} the header name
   * @param value {string} the header value
   *
   * @return {HalRestClient} thiss
   */
  addHeader(header: string, value: string): IHalRestClient;

  /**
   * run post request
   * @param uri {string} resource uri to update
   * @param json {object} request body send
   * @param type {IHalResourceConstructor} if hal service return entity, type can be used to map return
   *                                        to an entity model
   */
  create: {
    (uri: string, json: object): Promise<Record<string, unknown>>;
    <T extends IHalResource>(uri: string, json: object, type?: IHalResourceConstructor<T>): Promise<T>;
  };

  /**
   * Delete object support
   *
   * according server, return can be :
   *   - the request
   *   - an halResource returned by server
   *   - a json object return by server
   *
   * @param resource : The resource to delete
   */
  delete: {

    (resource: IHalResource | string): Promise<Record<string, unknown>>;
    <T extends IHalResource>(resource: IHalResource | string, c?: IHalResourceConstructor<T>): Promise<T>;
  };

  /**
   * fetch a resource by its uri
   *
   * @param resourceURI : the uri of resource to fetch
   * @param c : the class to use to fetch. If you don't want to write you model, use HalResource
   */
  fetch<T extends IHalResource>(resourceURI: string, c: IHalResourceConstructor<T>): Promise<T>;

  /**
   * fetch an array by URI. Rest result can be a simple array of hal resources, or a hal resource whos first
   * property of _embedded is an array of hal resources
   *
   * @deprecated The method is not HAL compliant and will be removed in future versions
   * @param resourceURI : the uri of resource to fetch
   * @param c : model class to map result (array items). if you don't write your model, use HalResource class
   */
  fetchArray<T extends IHalResource>(resourceURI: string, c: IHalResourceConstructor<T>): Promise<Array<T>>;

  /**
   * set the json parser
   * @param {JSONParser} the new json parser
   */
  setJsonParser(parser: IJSONParser): IHalRestClient;

  /**
   * run put or patch request
   * @param url : resource url to update
   * @param json : request body send
   * @param full : true or false. true send put, false send patch. Default patch
   * @param type: if hal service return entity, type can be used to map return to an entity model
   */
  update: {
    (url: string, data: object, full?: boolean): Promise<Record<string, unknown>>;
    <T extends IHalResource>(url: string, data: object, full?: boolean, type?: IHalResourceConstructor<T>): Promise<T>;
  }
  //#endregion
}

export class HalRestClient implements IHalRestClient {
  //#region private properties ------------------------------------------------
  private axios: AxiosInstance;
  private jsonParser: IJSONParser;
  //#endregion

  //#region IHalRest client readonly properties -------------------------------
  public get config() {
    return this.axios.defaults;
  }

  public get requestInterceptors(): AxiosInterceptorManager<AxiosRequestConfig<any>> {
    return this.axios.interceptors.request;
  }

  /**
   * get axions config interceptor
   * @return {AxiosInterceptorManager}
   */
  public get responseInterceptors(): AxiosInterceptorManager<AxiosResponse<any, any>> {
    return this.axios.interceptors.response;
  }
  //#endregion

  //#region Constructor & C° --------------------------------------------------
  constructor(baseURL?: string, options: AxiosRequestConfig = {}) {
    const config = options;
    config.baseURL = baseURL;
    this.axios = Axios.create(config);
    this.setJsonParser(new JSONParser(this));
  }
  //#endregion

  //#region IHalRest interface methods ----------------------------------------

  // TODO 1660 Remove non compliant feature of retrieving an array of HAL-resources
  public fetchArray<T extends IHalResource>(resourceURI: string, c: IHalResourceConstructor<T>): Promise<Array<T>> {
    return new Promise((resolve, reject) => {
      this.axios.get(resourceURI).then((value: AxiosResponse<any, any>) => {
        let array: Array<unknown>;
        if (!Array.isArray(value.data)) {
          if ("_embedded" in value.data) {
            const embedded: unknown = value.data._embedded;
            const firstKey = Object.keys(embedded)[0];
            if (firstKey) {
              array = embedded[firstKey];
              if (!Array.isArray(array)) {
                reject(new Error("property _embedded." + Object.keys(embedded)[0] + " is not an array"));
              }
            } else {
              reject(new Error("property _embedded does not contain an array"));
            }

          } else {
            reject(new Error("Unparsable array: it's neither an array nor an halResource"));
          }
        } else {
          array = value.data;
        }
        resolve(array.map((item: unknown) => this.jsonParser.objectToHalResource(item, resourceURI, c)));
      }).catch(reject);
    });
  }

  public fetch<T extends IHalResource>(resourceURI: string, c: IHalResourceConstructor<T>): Promise<T> {
    return this.fetchInternal(resourceURI, c);
  }

  public delete<T extends IHalResource>(resource: IHalResource | string, c?: IHalResourceConstructor<T>): Promise<T | Record<string, unknown>> {
    let uri: string;
    if (typeof resource === "string") {
      uri = resource;
    } else {
      uri = resource.uri.resourceURI;
    }

    return new Promise((resolve, reject) => {
      this.axios.delete(uri).then((response: AxiosResponse<any, any>) => {
        if (c) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(this.jsonParser.objectToHalResource(response.data, uri, c));
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(response.data ? response.data : response);
        }
      }).catch(reject);
    });
  }

  public update<T extends IHalResource>(
    url: string,
    data: object,
    full?: boolean,
    type?: IHalResourceConstructor<T>): Promise<T | Record<string, unknown>> {
    const method = full ? "put" : "patch";
    return new Promise((resolve, reject) => {
      this.axios.request({ data, method, url }).then((response: AxiosResponse<any, any>) => {
        if (type) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(this.jsonParser.objectToHalResource(response.data, url, type, undefined, response.config.url));
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(response.data ? response.data : response);
        }
      }).catch(reject);
    });
  }

  public create<T extends IHalResource>(uri: string, json: object, type?: IHalResourceConstructor<T>): Promise<T | Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      this.axios.post(uri, json).then((response: AxiosResponse<any, any>) => {
        if (type) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(this.jsonParser.objectToHalResource(response.data, uri, type, undefined, response.config.url));
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(response.data ? response.data : response);
        }
      }).catch(reject);
    });
  }

  public addHeader(header: string, value: string): IHalRestClient {
    this.config.headers.common[header] = value;
    return this;
  }

  public setJsonParser(parser: IJSONParser): IHalRestClient {
    this.jsonParser = parser;
    return this;
  }
  //#endregion

  //#region methods for internal use in the library ---------------------------
  /**
  * call an URI to fetch a resource
  *
  * @param resourceURI : the uri of resource to fetch
  * @param c : the class to use to fetch. If you don't want to write you model, use HalResource or @{see fetchResource}
  * @param resource
  */
  public fetchInternal<T extends IHalResource>(resourceURI: string, c: IHalResourceConstructor<T>, resource?: T): Promise<T> {
    return new Promise((resolve, reject) => {
      this.axios.get(resourceURI).then((response: AxiosResponse<any, any>) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        resolve(this.jsonParser.objectToHalResource(response.data, resourceURI, c, resource, response.config.url));
      }).catch(reject);
    });
  }
  //#endregion
}
