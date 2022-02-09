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
          resolve(this.jsonParser.objectToHalResource(this, response.data, uri, type));
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
          resolve(this.jsonParser.objectToHalResource(this, response.data, url, type, undefined, response.config.url));
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
        if (type) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resolve(this.jsonParser.objectToHalResource(this, response.data, uri, type, undefined, response.config.url));
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
  * @param uri : the uri of resource to fetch
  * @param type : the class to use to fetch. If you don't want to write you model, use HalResource or @{see fetchResource}
  * @param resource
  */
  public fetchInternal<T extends IHalResource>(uri: string, type: IHalResourceConstructor<T>, resource?: T): Promise<T> {
    return new Promise((resolve, reject) => {
      this.axios.get(uri).then((response: AxiosResponse<any, any>) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        resolve(this.jsonParser.objectToHalResource(this, response.data, uri, type, resource, response.config.url));
      }).catch(reject);
    });
  }
  //#endregion
}
