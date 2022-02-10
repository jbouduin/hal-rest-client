import { createResourceInternal } from "./hal-factory";
import { JSONParserException } from "./hal-json-parser.exception";
import { HalResource } from "./hal-resource";
import { IHalResource, IHalResourceConstructor } from "./hal-resource.interface";
import { IHalRestClient } from "./hal-rest-client.interface";
import { UriData } from "./uri-data";

export interface IJSONParser {
  /**
   * Convert an object to a HalResource
   * @param halRestClient - the hal-rest client
   * @param data - the object to convert to a resource
   * @param requestedUri - the requested URI that returned the 'root' resource.
   * @param resourceType - the type of HalResource to be created
   * @param resource - optional parameter. Only set when following a link
   * @param receivedUri - the uri fetched from the server. This could be the final uri after a chain of redirections
   * @returns a Halrource of the requested type
   */
  objectToHalResource<T extends IHalResource>(
    halRestClient: IHalRestClient,
    data: Record<string, any>,
    requestedURI: string,
    resourceType: IHalResourceConstructor<T>,
    resource?: T,
    receivedUri?: string,
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
    receivedURI?: string): T {
    // let resource:T
    if (Array.isArray(json)) {
      throw new JSONParserException(json);
    }

    if (!resource) {
      resource = this.getResource(halRestClient, json, requestedURI, receivedURI, resourceType);
    } else {
      const resourceUri = resource['_uri'] as UriData;
      if (resource.uri.templated) {
        resourceUri.setFetchedUri(requestedURI);
      }
      resourceUri.receivedUri = receivedURI;
      resourceUri.requestedUri = requestedURI;
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
          }
          // else {
          //   const uri = this.buildURI(this.tryConvertLink(links.self), receivedURI);
          //   // resource.setUri(uri);
          // }
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
    const href =  this.buildURI(link);
    const linkResource = createResourceInternal(halRestClient, type, href);
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

  private buildURI(link: string | IHalLink, fetchedUri?: string): UriData {
    let result: UriData;
    if (typeof link === "string") {
      result = new UriData(link, false);
    } else {

      const uri = link.href;
      const templated = link.templated || false;
      result = new UriData(uri, templated, undefined, fetchedUri, link.type);
      if (templated) {
        result.setFetchedUri(fetchedUri);
      }
    }
    // console.log(result);
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
    requestedUri: string,
    receivedUri: string,
    type: IHalResourceConstructor<T>): T {

    let uri: UriData;
    if (json._links?.self) {
      if (typeof json._links.self === "string") {
        //eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        uri = new UriData(json._links.self, false, requestedUri, receivedUri);
      } else {
        const templated = json._links.self.templated;
        //eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        uri = new UriData(json._links.self.href, templated, requestedUri, receivedUri, json._links.self.type);
        if (templated) {
          uri.setFetchedUri(receivedUri);
        }
      }
    }
    else {
      //eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      uri = new UriData(null, false, requestedUri, receivedUri);
    }

    const result = createResourceInternal(halRestClient, type, uri);
    if (result instanceof HalResource) {
      result.reset();
    }
    return result;
  }
  //#endregion
}
