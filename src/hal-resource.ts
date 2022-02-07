import { DefaultSerializer, IJSONSerializer } from "./hal-json-serializer";
import { IHalResource, IHalResourceConstructor } from "./hal-resource-interface";
import { HalRestClient, IHalRestClient } from "./hal-rest-client";
import { URI } from "./uri";

// TODO 1663 refactor HalResource :add a getter: hasChanges();
export class HalResource implements IHalResource {
  protected _links: Record<string, any>;
  protected _props: Record<string, any>;
  protected _uri?: URI;

  public get links(): Record<string, any> { return this._links; }
  public get props(): Record<string, any> { return this._props; }

  // TODO 1663 refactor HalResource: should be a public get private/internal set (it is only set by the JSON Parser)
  public isLoaded = false;

  protected restClient: IHalRestClient;

  private readonly settedProps: Array<string>;
  private readonly settedLinks: Array<string>;
  private initEnded = false;


  constructor(restClient: IHalRestClient, uri?: URI) {
    this.restClient = restClient;
    this._uri = uri;
    this._links = {};
    this._props = {};
    this.settedLinks = new Array<string>();
    this.settedProps = new Array<string>();
  }

  public static createFromExisting<T extends HalResource>(existing: T, type: IHalResourceConstructor<T>): T {
    const result = new type(existing.restClient, existing._uri);
    result._links = existing.links;
    result._props = existing.props;
    result.settedLinks.push(...existing.settedLinks);
    result.settedProps.push(...existing.settedProps);
    return result;
  }

  public fetch(forceOrParams?: boolean | object): Promise<this> {
    if ((this.isLoaded && !forceOrParams) || this.uri === undefined) {
      return new Promise((resolve) => resolve(this));
    } else {
      return (this.restClient as HalRestClient).fetchInternal(
        this.uri.fill(forceOrParams as object),
        this.constructor as IHalResourceConstructor<this>,
        this,
      );
    }
  }

  /**
   * to clear value use null not undefined
   */
  // TODO 1663 refactor HalResource prop(name: string, value?: any) / consider generic method also
  public prop(name: string, value?: any): any {
    if (value !== void 0) {
      if (this.links[name]) {
        this.link(name, value);
      } else {
        if (this.props[name] !== value) {
          this.props[name] = value;
          if (this.initEnded) {
            this.settedProps.push(name);
          }
        }
      }
      return this;
    } else {
      if (this.props[name] !== undefined) {
        return this.props[name];
      } else if (this.links[name]) {
        return this.link(name);
      }
    }
  }

  set uri(uri: URI) {
    this._uri = uri;
  }

  get uri(): URI {
    return this._uri;
  }
  /**
   * to clear value use null not undefined
   */
  // TODO 1663 refactor HalResource : can we replace any by HalResource ?
  // TODO 1663 refactor HalResource prop(name: string, value?: any)
  public link(name: string, value?: any): any {
    if (value !== void 0) {
      if (this.links[name] !== value) {
        this.links[name] = value;
        if (this.initEnded) {
          this.settedLinks.push(name);
        }
      }
      return this;
    } else {
      return this.links[name];
    }
  }

  /**
   * delete the resource
   * according server, return can be :
   *   - the request
   *   - an halResource returned by server
   *   - a json object return by server
   */
  public delete<T extends IHalResource>(c?: IHalResourceConstructor<T>): Promise<T | Record<string, any>> {
    return this.restClient.delete(this, c);
  }

  public onInitEnded() {
    this.initEnded = true;
  }

  /**
   * update the resource
   *
   * @param serializer : object used to serialize the prop and link value
   */
  public update<T extends IHalResource>(c?: IHalResourceConstructor<T>, serializer?: IJSONSerializer): Promise<T | Record<string, any>> {
    const json = this.serialize(this.settedProps, this.settedLinks, serializer);
    return this.restClient.update(this.uri.resourceURI, json, false, c);
  }

  /**
   * save the resource
   */
  public create<T extends IHalResource>(c?: IHalResourceConstructor<T>, serializer?: IJSONSerializer): Promise<T | Record<string, any>> {
    const json = this.serialize(Object.keys(this.props), Object.keys(this.links), serializer);
    return this.restClient.create(this.uri.resourceURI, json, c);
  }

  public reset(): void {
    Object.keys(this.props).forEach((prop) => {
      delete this.props[prop];
    });

    Object.keys(this.links).forEach((prop) => {
      delete this.props[prop];
    });
  }

  /**
   * get the service prop name corresponding to ts attribute name
   */
  protected tsProptoHalProd(prop: string) {
    const tsToHal = Reflect.getMetadata("halClient:tsToHal", this)
    return tsToHal ? tsToHal[prop] : prop;
  }

  /**
   * serialize this object to json
   */
  private serialize(props: Array<string>, links: Array<string>, serializer: IJSONSerializer = new DefaultSerializer()): object {
    const json = {};

    for (const prop of props) {
      const jsonKey = this.tsProptoHalProd(prop);
      if (this.props[prop] !== undefined && this.props[prop] !== null && this.props[prop].onInitEnded !== undefined) {
        json[jsonKey] = serializer.parseResource(this.props[prop] as IHalResource);
      } else {
        json[jsonKey] = serializer.parseProp(this.props[prop]);
      }
    }

    for (const link of links) {
      const jsonKey = this.tsProptoHalProd(link);
      json[jsonKey] = serializer.parseResource(this.links[link] as IHalResource);
    }

    return json;
  }
}
