import { createResource } from "./hal-factory";
import { JSONParserException } from "./hal-json-parser-exception";
import { HalResource } from "./hal-resource";
import { IHalResource, IHalResourceConstructor } from "./hal-resource-interface";
import { HalRestClient } from "./hal-rest-client";
import { URI } from "./uri";

export interface IJSONParser {
  jsonToResource<T extends IHalResource>(
    json: Record<string, any>,
    c: IHalResourceConstructor<T>,
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

export class JSONParser implements IJSONParser {

  constructor(private halRestClient: HalRestClient) { }

  /**
   * convert a json to an halResource
   */
  public jsonToResource<T extends IHalResource>(
    json: Record<string, any>,
    c: IHalResourceConstructor<T>,
    resource?: T,
    fetchedURI?: string): T {

    if (Array.isArray(json)) {
      throw new JSONParserException(json);
    }

    if (!resource) {
      let uri: string;
      if (json._links?.self) {
        if (typeof json._links.self === "string") {
          uri = json._links.self;
        } else if (!json._links.self.templated) {
          uri = json._links.self.href
        }
      }
      resource = createResource(this.halRestClient, c, uri);
      if (resource instanceof HalResource) {
        resource.reset();
      }
    }

    // get translation between hal-service-name and name on ts class
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const halToTs: Record<string, string> = Reflect.getMetadata("halClient:halToTs", c.prototype) || {};
    for (const key in json) {
      if (key === "_links") {
        const links: Record<string, unknown> = json._links;
        for (const linkKey in json._links) {
          if (linkKey !== "self") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const type = Reflect.getMetadata("halClient:specificType", c.prototype, linkKey) || HalResource;
            const propKey = halToTs[linkKey] || linkKey;
            let result: any;
            if (Array.isArray(links[linkKey])) {
              result = (links[linkKey] as Array<any>).map((item) => this.processLink(this.tryConvertLink(item), type)) // eslint-disable-line
            } else {
              const link = this.tryConvertLink(links[linkKey]);
              result = this.processLink(link, type); // eslint-disable-line
            }
            resource.link(propKey, result);
          }
        }
        if (links.self) {
          resource.uri = this.extractURI(this.tryConvertLink(links.self), fetchedURI);
        }
      } else if ("_embedded" === key) {
        const embedded: Record<string, unknown> = json._embedded;
        for (const prop of Object.keys(embedded)) {
          const propKey = halToTs[prop] || prop;
          resource.prop(propKey, this.parseJson(embedded[prop], c, propKey));
        }
      } else {
        const propKey = halToTs[key] || key;
        resource.prop(propKey, this.parseJson(json[key], c, propKey));
      }
    }

    resource.isLoaded = true;
    resource.onInitEnded();
    return resource;
  }

  private processLink<T extends IHalResource>(link: string | IHalLink, type: IHalResourceConstructor<T>): T {
    const href = this.extractURI(link);
    const linkResource = createResource(this.halRestClient, type, href);
    for (const propKey of Object.keys(link)) {
      linkResource.prop(propKey, link[propKey]);
    }
    return linkResource;
  }

  /**
   * parse a json to object
   */
  private parseJson(json, clazz?: { prototype: any }, key?: string): any {

    if (json === null) {
      return null;
    } else if (Array.isArray(json)) {
      return json.map((item) => this.parseJson(item, clazz, key));
    } else if (typeof json === "object") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const type = Reflect.getMetadata("halClient:specificType", clazz.prototype, key);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const isHal: Record<string, string> = Reflect.getMetadata("halClient:isHal", clazz.prototype) || {};
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const tsToHal: Record<string, string> = Reflect.getMetadata("halClient:tsToHal", clazz.prototype) || {};
      const name = tsToHal[key]
      if (type == undefined || (isHal && isHal[name || key])) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return this.jsonToResource(json, type || HalResource);
      } else {
        return json;
      }

    } else {
      return json;
    }
  }

  private extractURI(link: string | { href?: string, templated?: boolean }, fetchedUri?: string): URI {
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

  private tryConvertLink(value: string | Record<string, any>): IHalLink {
    let result: IHalLink;
    if (typeof value === 'string') {
      result = { href: value };
    } else {
      const keys = Object.keys(value);
      if (keys.indexOf('href') < 0) {
        throw new JSONParserException(value, 'Link should contain href property');
      } else {
        result = { href: value.href };
        Object.keys(value)
          .filter((key: string) => key !== 'href')
          .forEach((key: string) => result[key] = value[key]);
      }
    }
    return result;
  }
}
