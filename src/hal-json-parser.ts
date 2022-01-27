import { createResource } from "./hal-factory";
import { HalResource } from "./hal-resource";
import { IHalResource, IHalResourceConstructor } from "./hal-resource-interface";
import { HalRestClient } from "./hal-rest-client";
import { URI } from "./uri";

export interface IJSONParser {
  jsonToResource<T extends IHalResource>(
    json: any,
    c: IHalResourceConstructor<T>,
    resource?: T,
    fetchedURI?: string,
  ): T;
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
    fetchedURI?: string,
  ): T {
    if (!("_links" in json)) {
      throw new Error("object is not hal resource " + JSON.stringify(json));
    }

    if (!resource) {
      let uri: string;
      if (json._links.self) {
        uri = typeof json._links.self === "string" ? json._links.self : json._links.self.href;
      }
      resource = createResource(this.halRestClient, c, uri);
      resource.reset();
    }

    // get translation between hal-service-name and name on ts class
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const halToTs: Record<string, string> = Reflect.getMetadata("halClient:halToTs", c.prototype)  || {};
    for (const key in json) {
      if (key === "_links") {
        const links: Record<string, unknown> = json._links;
        for (const linkKey in json._links) {
          if (linkKey !== "self") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const type = Reflect.getMetadata("halClient:specificType", c.prototype, linkKey) || HalResource;
            const propKey = halToTs[linkKey] || linkKey;
            const link = this.tryConvertLink(links[linkKey]);

            const result = Array.isArray(link)
              ? link.map((item) => this.processLink(this.tryConvertLink(item), type)) // eslint-disable-line
              : this.processLink(link, type); // eslint-disable-line
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

  private processLink<T extends IHalResource>(link: string | { href?: string, templated?: boolean }, type: IHalResourceConstructor<T>): T {
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
    // if there are _links prop object is a resource
    if (json === null) {
      return null;
    } else if (Array.isArray(json)) {
      return json.map((item) => this.parseJson(item, clazz, key));
    } else if (typeof json === "object" && json._links !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const type = Reflect.getMetadata("halClient:specificType", clazz.prototype, key) || HalResource;
      // eslint-disable-next-line
      return this.jsonToResource(json, type);
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

  private tryConvertLink(value: unknown): string | { href?: string, templated?: boolean } {
    let result: string | { href?: string, templated?: boolean };
    if (typeof value === 'string') {
      result = value;
    } else if ((value as any).href) {
      result = value;
      result.templated = (value as any).templated
    } else {
      result = value;
    }
    return result;
  }
}
