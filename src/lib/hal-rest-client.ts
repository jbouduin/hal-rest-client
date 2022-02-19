import "reflect-metadata";
import Axios, { AxiosInterceptorManager } from "axios";
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { IJSONParser, JSONParser } from "./hal-json-parser";
import { IHalResourceConstructor, IHalResource } from "./hal-resource.interface";
import { IHalRestClient } from "./hal-rest-client.interface";

// TODO 1659 Appropriate Encapsulation
// hide that internal method

/**
 * The Hal-Rest client
 */

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

  public get responseInterceptors(): AxiosInterceptorManager<AxiosResponse<any, any>> {
    return this.axios.interceptors.response;
  }
  //#endregion

  //#region Constructor & C° --------------------------------------------------
  constructor(baseURL?: string, options: AxiosRequestConfig = {}) {
    const config = options;
    config.baseURL = baseURL;
    this.axios = Axios.create(config);
    this.setJsonParser(new JSONParser());
  }
  //#endregion

  //#region IHalRest interface methods ----------------------------------------

  // TODO 1660 Remove non compliant feature of retrieving an array of HAL-resources
  public fetchArray<T extends IHalResource>(uri: string, type: IHalResourceConstructor<T>): Promise<Array<T>> {
    return new Promise((resolve, reject) => {
      this.axios.get(uri).then((value: AxiosResponse<any, any>) => {
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
        resolve(array.map((item: unknown) => this.jsonParser.objectToHalResource(this, item, uri, type)));
      }).catch(reject);
    });
  }

  public fetch<T extends IHalResource>(uri: string, type: IHalResourceConstructor<T>): Promise<T> {
    return this.fetchInternal(uri, type);
  }

  public delete<T extends IHalResource>(resource: IHalResource | string, type?: IHalResourceConstructor<T>): Promise<T | Record<string, unknown>> {
    let uri: string;
    if (typeof resource === "string") {
      uri = resource;
    } else {
      uri = resource.uri.resourceUri;
    }

    return new Promise((resolve, reject) => {
      this.axios.delete(uri).then((response: AxiosResponse<any, any>) => {
        if (type) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(this.jsonParser.objectToHalResource(this, response.data, uri, type, undefined, response.request.res.responseUrl));
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
          resolve(this.jsonParser.objectToHalResource(this, response.data, url, type, undefined, response.request.res.responseUrl));
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(response.data ? response.data : response);
        }
      }).catch(reject);
    });
  }

  public create<T extends IHalResource>(uri: string, data: object, type?: IHalResourceConstructor<T>): Promise<T | Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      this.axios.post(uri, data).then((response: AxiosResponse<any, any>) => {
        // const fetchedUrl = response.request.res.responseUrl;
        // console.log(Object.keys(response.request.res).join(', '));
        // console.log(`uri: ${uri}, response.config.url: ${response.config.url}, fetched: ${fetchedUrl}`)
        if (type) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(this.jsonParser.objectToHalResource(this, response.data, uri, type, undefined, response.request.res.responseUrl));
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
   * internal method to send a get request to the server
   *
   * @template T - a resource type extending {IHalResource}
   * @param {string} uri - the uri of resource to fetch
   * @param {IHalResourceConstructor<T>} type : the resulting HalResource class to use to fetch. If you don't want to write a model, use HalResource
   * @param {T} resource - an existing resource to be fetched. If undefined or null, a new resource is created
   * @returns {T} - a resource of type T
   */
  public fetchInternal<T extends IHalResource>(uri: string, type: IHalResourceConstructor<T>, resource?: T): Promise<T> {
    return new Promise((resolve, reject) => {
      this.axios.get(uri).then((response: AxiosResponse<any, any>) => {
        // console.log(`requested ${uri}, responsed ${response.request.res.responseUrl}`);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        resolve(this.jsonParser.objectToHalResource(this, response.data, uri, type, resource, response.request.res.responseUrl));
      }).catch(reject);
    });
  }
  //#endregion

  //#region toJSON ------------------------------------------------------------
  private toJSON(): any {
    return {
      baseUrl: this.config.baseURL,
      headers: this.config.headers,
      requestInterceptors: this.requestInterceptors,
      responseInterceptors: this.responseInterceptors
    };
  }
}
