import "reflect-metadata";
import Axios from "axios";
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { IJSONParser, JSONParser } from "./hal-json-parser";
import { IHalResource, IHalResourceConstructor } from "./hal-resource-interface";

// TODO 1659 Appropriate Encapsulation
// create IHalRestClient Interface
// hide that internal method

/**
 * base to rest client
 *
 * can fetch resource :
 * ``` ts
 * let resource = await new HalRestClient().fetch('http://foo.bar/resource');
 *
 * // can access properties with
 * resource.prop('my_prop')
 *
 * // can get _links with
 * var linkResource = resource.link('my_link')
 *
 * // can fetch link
 * await linkResource.fetch();
 * ```
 */
export class HalRestClient {
  //#region private properties ------------------------------------------------
  private axios: AxiosInstance;
  private jsonParser: IJSONParser;
  //#endregion

  //#region public getters ----------------------------------------------------
  /**
   * Get axios config for customization
   *
   * @return {AxiosRequestConfig}
   */
  public get config() {
    return this.axios.defaults;
  }

  /**
   * get axions config interceptor
   * @return {AxiosInterceptorManager}
   */
  public get interceptors() {
    return this.axios.interceptors;
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

  //#region public methods ----------------------------------------------------
  /**
   * fetch an URI on HalResource
   *
   * @param resourceURI : The uri to fetch
   */
  public fetchResource<T extends IHalResource>(resourceURI: string, c: IHalResourceConstructor<T>): Promise<T> {
    return this.fetch(resourceURI, c);
  }

  /**
   * fetch an array by URI. Rest result can be a simple array of hal resources, or a hal resource whos first
   * property of _embedded is an array of hal resources
   * @deprecated The method is not HAL compliant and will be removed in future versions
   * @param resourceURI : the uri of resource to fetch
   * @param c : model class to map result (array items). if you don't write your model, use HalResource class
   */
  // TODO 1660 Remove non compliant feature of retrieving an array of HAL-resources
  public fetchArray<T extends IHalResource>(resourceURI: string, c: IHalResourceConstructor<T>): Promise<Array<T>> {
    return new Promise((resolve, reject) => {
      this.axios.get(resourceURI).then((value) => {
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
        resolve(array.map((item: unknown) => this.jsonParser.jsonToResource(item, resourceURI, c)));
      }).catch(reject);
    });
  }

  /**
   * call an URI to fetch a resource
   *
   * @param resourceURI : the uri of resource to fetch
   * @param c : the class to use to fetch. If you don't want to write you model, use HalResource
   */
  public fetch<T extends IHalResource>(resourceURI: string, c: IHalResourceConstructor<T>): Promise<T> {
    return this.fetchInternal(resourceURI, c);
  }

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
  public delete<T extends IHalResource>(resource: IHalResource | string, c?: IHalResourceConstructor<T>): Promise<T | Record<string, any>> {
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
          resolve(this.jsonParser.jsonToResource(response.data, uri, c));
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(response.data ? response.data : response);
        }
      }).catch(reject);
    });
  }

  /**
   * run put or patch request
   * @param url : resource url to update
   * @param json : request body send
   * @param full : true or false. true send put, false send patch. Default patch
   * @param type: if hal service return entity, type can be used to map return to an entity model
   */
  public update<T extends IHalResource>(
    url: string,
    data: object,
    full = false,
    type?: IHalResourceConstructor<T>): Promise<T | Record<string, string>> {
    const method = full ? "put" : "patch";
    return new Promise((resolve, reject) => {
      this.axios.request({ data, method, url }).then((response: AxiosResponse<any, any>) => {
        if (type) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(this.jsonParser.jsonToResource(response.data, url, type, undefined, response.config.url));
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(response.data ? response.data : response);
        }
      }).catch(reject);
    });
  }

  /**
   * run post request
   * @param uri {string} resource uri to update
   * @param json {object} request body send
   * @param type {IHalResourceConstructor} if hal service return entity, type can be used to map return
   *                                        to an entity model
   */
  public create<T extends IHalResource>(uri: string, json: object, type?: IHalResourceConstructor<T>): Promise<T | Record<string, string>> {
    return new Promise((resolve, reject) => {
      this.axios.post(uri, json).then((response: AxiosResponse<any, any>) => {
        if (type) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(this.jsonParser.jsonToResource(response.data, uri, type, undefined, response.config.url));
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(response.data ? response.data : response);
        }
      }).catch(reject);
    });
  }

  /**
   * add header configuration
   * @param header {string} the header name
   * @param value {string} the header value
   *
   * @return {HalRestClient} thiss
   */
  public addHeader(header: string, value: string): HalRestClient {
    this.config.headers.common[header] = value;
    return this;
  }

  /**
   * set the json parser
   * @param {JSONParser} the new json parser
   */
  public setJsonParser(parser: IJSONParser) {
    this.jsonParser = parser;
  }
  //#endregion

  //#region methods for internal use in the library ---------------------------
  /**
  * call an URI to fetch a resource
  *
  * @param resourceURI : the uri of resource to fetch
  * @param c : the class to use to fetch. If you don't want to write you model, use HalResource or @{see fetchResource}
  * @param resource : don't use. internal only
  */
  public fetchInternal<T extends IHalResource>(resourceURI: string, c: IHalResourceConstructor<T>, resource?: T): Promise<T> {
    return new Promise((resolve, reject) => {
      this.axios.get(resourceURI).then((response: AxiosResponse<any, any>) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        resolve(this.jsonParser.jsonToResource(response.data, resourceURI, c, resource, response.config.url));
      }).catch(reject);
    });
  }
  //#endregion
}
