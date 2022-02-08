import { createResource } from "./hal-factory";
import { JSONParserException } from "./hal-json-parser.exception";
import { HalResource } from "./hal-resource";
import { IHalResource, IHalResourceConstructor } from "./hal-resource.interface";
import { IHalRestClient } from "./hal-rest-client.interface";
import { URI } from "./uri";

export interface IJSONParser {
  /**
   * Convert an object to a HalResource
   * @param halRestClient
   * @param data the object to convert to a resource
   * @param requestedUri the requested URI that returned the 'root' resource. This value should be passed through when recursing
   * @param resourceType the type of HalResource to be created
   * @param resource : the existing resource if we merge an existing one with new data
   * @param fetchedURI : the uri fetched from the server, this one is not passed through when recursing
   * @returns a Halrource of the requested type
   */
  objectToHalResource<T extends IHalResource>(
    halRestClient: IHalRestClient,
    data: Record<string, any>,
    requestedURI: string,
    resourceType: IHalResourceConstructor<T>,
    resource?: T,
    fetchedURI?: string,
  ): T;
}

interface IHalLink {
  href: string,
  templated?: boolean;
  type?: string;
  name?: string;
  title?: string;
  [key: string]: any;
}

/** @internal */
export class JSONParser implements IJSONParser {

  //#region IJsonParser interface method --------------------------------------
  public objectToHalResource<T extends IHalResource>(
    halRestClient: IHalRestClient,
    json: Record<string, any>,
    requestedURI: string,
    resourceType: IHalResourceConstructor<T>,
    resource?: T,
    fetchedURI?: string): T {
    // let resource:T
    if (Array.isArray(json)) {
      throw new JSONParserException(json);
    }

    if (!resource) {
      resource = this.getResource(halRestClient, json, requestedURI, resourceType);
    }

    // get translation between hal-service-name and name on ts class
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const halToTs: Record<string, string> = Reflect.getMetadata("halClient:halToTs", resourceType.prototype) || {};
    for (const key in json) {
      if (key === "_links") {
        const links: Record<string, unknown> = json._links;
        for (const linkKey in json._links) {
          if (linkKey !== "self") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const specificType = Reflect.getMetadata("halClient:specificType", resourceType.prototype, linkKey) || HalResource;
            const propKey = halToTs[linkKey] || linkKey;

            if (Array.isArray(links[linkKey])) {
              resource.setLink(
                propKey,
                (links[linkKey] as Array<any>).map((item) => this.processLink(halRestClient, this.tryConvertLink(item), specificType)) // eslint-disable-line
              );
            } else {
              const link = this.tryConvertLink(links[linkKey]);
              resource.setLink(propKey, this.processLink(halRestClient, link, specificType)); // eslint-disable-line
            }
          } else {
            const uri = this.buildURI(this.tryConvertLink(links.self), fetchedURI);
            resource.setUri(uri);
          }
        }
      } else if (key === "_embedded") {
        const embedded: Record<string, unknown> = json._embedded;
        for (const prop of Object.keys(embedded)) {
          const propKey = halToTs[prop] || prop;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          resource.setProp(propKey, this.parseJson(halRestClient, embedded[prop], true, requestedURI, resourceType.prototype, propKey));
        }
      } else {
        const propKey = halToTs[key] || key;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        resource.setProp(propKey, this.parseJson(halRestClient, json[key], false, requestedURI, resourceType.prototype, propKey));
      }
    }

    resource.setLoaded();
    resource.onInitEnded();
    return resource;
  }
  //#endregion

  //#region private methods ---------------------------------------------------
  private processLink<T extends IHalResource>(halRestClient: IHalRestClient, link: string | IHalLink, type: IHalResourceConstructor<T>): T {
    let linkResource: T;
    const href = this.buildURI(link);

    if (typeof link !== 'string' && link.type && link.type !== 'application/hal+json') {
      // TODO 1689 Refactor ProcessLink in json-parser (probably extract it to link-parser.ts)
      // not really correct to decide here that we will not cache
      linkResource = new type(halRestClient, href);
    } else {
      linkResource = createResource(halRestClient, type, href);
    }
    for (const propKey of Object.keys(link)) {
      // TODO 1689 Refactor ProcessLink in json-parser
      // this will still copy and eventually overwrite typical link properties (like title, and name) to the resource!
      linkResource.setProp(propKey, link[propKey]);
    }

    return linkResource;
  }

  private parseJson(
    halRestClient: IHalRestClient,
    json,
    isEmbedded: boolean,
    requestedUri: string,
    classPrototype: object,
    key: string): any {

    if (json === null) {
      return null;
    } else if (Array.isArray(json)) {
      return json.map((item) => this.parseJson(halRestClient, item, isEmbedded, requestedUri, classPrototype, key));
    } else if (typeof json === "object") {
      const targetType = Reflect.getMetadata("halClient:specificType", classPrototype, key);
      const isHal: Record<string, string> = Reflect.getMetadata("halClient:isHal", classPrototype) || {};
      const tsToHal: Record<string, string> = Reflect.getMetadata("halClient:tsToHal", classPrototype) || {};
      const name = tsToHal[key];
      if ((targetType == undefined && isEmbedded) || (isHal && isHal[name || key])) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return this.objectToHalResource(halRestClient, json, requestedUri, targetType || HalResource);
      } else if (targetType) {
        const result = new targetType();
        for (const subkey in json) {
          result[subkey] = this.parseJson(halRestClient, json[subkey], false, requestedUri, classPrototype, subkey);
        }
        return result;
      } else {
        return json;
      }
    } else {
      return json;
    }
  }

  private buildURI(link: string | IHalLink, fetchedUri?: string): URI {
    let result: URI;
    if (typeof link === "string") {
      result = new URI(link, false);
    } else {
      const uri = link.href;
      const templated = link.templated || false;
      result = new URI(uri, templated);
      if (templated) {
        result.setFetchedUri(fetchedUri || '');
      }
    }
    return result;
  }

  /**
   * Try to convert the input to a Link-alike result
   * @param value a string or an object
   * @returns a IHalLink that can be converted to a HalResource
   */
  private tryConvertLink(value: string | Record<string, any>): IHalLink {
    let result: IHalLink;
    if (!value) {
      result = { href: null };
    } else if (typeof value === 'string') {
      result = { href: value };
    } else {
      const keys = Object.keys(value);
      if (keys.indexOf('href') < 0) {
        throw new JSONParserException(value, 'Link should contain href property');
      } else {
        result = { href: value.href };
        // copy all other properties
        Object.keys(value)
          .filter((key: string) => key !== 'href')
          .forEach((key: string) => result[key] = value[key]);
      }
    }
    return result;
  }

  private getResource<T extends IHalResource>(
    halRestClient: IHalRestClient,
    json: Record<string, any>,
    requestedURI: string,
    type: IHalResourceConstructor<T>): T {
    let cacheKey: string;
    // calculate the cache key:
    // if no self-link => No caching
    // if self-link is templated => no caching
    // self-link is absolute => cache using self-link as key
    // rest client has no base URI and self-link is relative => no caching
    // rest client has a base URI and resource was retrieve from a different base URI => no cache
    // rest client has a base URI and self-link is relative => cache using combined base URI and self-link
    // rest client has a base URI and self-link is absolute and starts with the baseURL of the rest client => use self-link as cache key
    // rest client has a base URI and self-link is absolute but does not start with the baseURL of the rest client => no caching
    if (json._links?.self) {
      if (typeof json._links.self === "string") {
        cacheKey = json._links.self;
      } else if (!json._links.self.templated) {
        cacheKey = json._links.self.href;
      }
    }

    if (cacheKey) {
      if (!cacheKey.toLowerCase().startsWith('http')) {
        if (!halRestClient.config.baseURL) {
          cacheKey = undefined;
        } else {
          if (requestedURI.toLowerCase().startsWith('http') && !requestedURI.startsWith(halRestClient.config.baseURL)) {
            cacheKey = undefined
          } else {
            cacheKey = `${halRestClient.config.baseURL}${cacheKey}`
          }
        }
      }
    }
    const result = createResource(halRestClient, type, cacheKey);
    if (result instanceof HalResource) {
      result.reset();
    }
    return result;
  }
  //#endregion
}
