import { cache } from './hal-factory';
import { DefaultSerializer } from './hal-json-serializer';
import { IJSONSerializer } from './hal-json-serializer.interface';
import { IHalResource, IHalResourceConstructor } from './hal-resource.interface';
import { HalRestClient } from './hal-rest-client';
import { IHalRestClient } from './hal-rest-client.interface';
import { IUriData, UriData } from './uri-data';

export class HalResource implements IHalResource {

  //#region Private properties ------------------------------------------------
  private _isLoaded: boolean;
  private _restClient: IHalRestClient;
  private _uri?: UriData;
  private readonly settedProps: Array<string>;
  private readonly settedLinks: Array<string>;
  private initEnded: boolean;
  private links: Record<string, IHalResource | Array<IHalResource>>;
  private props: Record<string, unknown>;
  //#endregion

  //#region IHalResource interface members ------------------------------------
  public get hasChanges(): boolean {
    return this.settedLinks.length + this.settedProps.length > 0;
  }

  public get isLoaded(): boolean {
    return this._isLoaded;
  }

  public get restClient(): IHalRestClient {
    return this._restClient;
  }

  public get uri(): IUriData {
    return this._uri;
  }

  //#endregion

  //#region Constructor & C° --------------------------------------------------
  public constructor(restClient: IHalRestClient, uri?: UriData) {
    this._restClient = restClient;
    this._uri = uri;
    this._isLoaded = false;
    this.initEnded = false;
    this.links = {};
    this.props = {};
    this.settedLinks = new Array<string>();
    this.settedProps = new Array<string>();
  }

  //#endregion

  //#region IHalResource methods ----------------------------------------------
  public fetch(forceOrParams?: boolean | object): Promise<this> {
    if ((this.isLoaded && !forceOrParams) || this.uri === undefined) {
      return new Promise((resolve) => resolve(this));
    } else {
      return (this.restClient as HalRestClient).fetchInternal(
        this._uri.fill(forceOrParams as object),
        this.constructor as IHalResourceConstructor<this>,
        this,
      );
    }
  }

  public setProp<T>(name: string, value?: T): void {
    if (this.links[name]) {
      if (Array.isArray(value)) {
        this.setLink(name, value)
      } else {
        this.setLink(name, (value as unknown) as IHalResource);
      }
    } else {
      if (this.props[name] !== value) {
        this.props[name] = value;
        if (this.initEnded) {
          this.settedProps.push(name);
        }
      }
    }
  }

  public getProp<T>(name: string): T {
    if (this.props[name] !== undefined) {
      return this.props[name] as T;
    } else if (this.links[name]) {

      return (this.links[name] as unknown) as T;
    }
    return undefined;
  }

  public setLink(name: string, value?: IHalResource | Array<IHalResource>): void {
    if (this.links[name] !== value) {
      this.links[name] = value;
      if (this.initEnded) {
        this.settedLinks.push(name);
      }
    }
  }

  public getLink<T = IHalResource | Array<IHalResource>>(name: string): T {
    return (this.links[name] as unknown) as T;
  }

  public delete<T extends IHalResource>(type?: IHalResourceConstructor<T>): Promise<T | Record<string, any>> {
    return this.restClient.delete(this, type);
  }

  public update<T extends IHalResource>(type?: IHalResourceConstructor<T>, serializer?: IJSONSerializer): Promise<T | Record<string, any>> {
    const json = this.serialize(this.settedProps, this.settedLinks, serializer);
    return this.restClient
      .update(this._uri.href, json, false, type)
      .then((response: T) => {
        this.clearChanges();
        return response;
      });
  }

  public create<T extends IHalResource>(type?: IHalResourceConstructor<T>, serializer?: IJSONSerializer): Promise<T | Record<string, any>> {
    const json = this.serialize(Object.keys(this.props), Object.keys(this.links), serializer);
    return this.restClient
      .create(this._uri.href, json, type)
      .then((response: T) => {
        this.clearChanges();
        return response;
      });
  }

  public convert<N extends IHalResource>(type: IHalResourceConstructor<N>): N {
    const result = new type(this.restClient, this._uri);
    result['links'] = this.links;
    result['props'] = this.props;
    // result['settedLinks'].push(...this.settedLinks);
    // result['settedProps'].push(...this.settedProps);
    result['_isLoaded'] = false;
    result['initEnded'] = false;
    return result;
  }

  public removeFromCache(): boolean {
    let result = false;
    const myCacheKey = (this.uri as UriData).calculateCacheKey(this.restClient.config.baseURL);
    if (cache.hasResource(myCacheKey)) {
      cache.clear('Resource', myCacheKey);
      result = true;
    }
    return result;
  }
  //#endregion

  //#region internal methods --------------------------------------------------
  /** @internal */
  public reset(): void {
    Object.keys(this.props).forEach((prop) => {
      delete this.props[prop];
    });

    Object.keys(this.links).forEach((prop) => {
      delete this.props[prop];
    });
  }

  /** @internal */
  public clearChanges(): void {
    this.settedLinks.length = 0;
    this.settedProps.length = 0;
  }

  /** @internal */
  public setUri(uri: UriData): void {
    this._uri = uri;
  }

  /** @internal */
  public onInitEnded(): void {
    this.initEnded = true;
  }

  /** @internal */
  setLoaded(): void {
    this._isLoaded = true;
  }
  //#endregion

  //#region private methods ---------------------------------------------------
  /**
   * serialize this object
   */
  private serialize(props: Array<string>, links: Array<string>, serializer: IJSONSerializer = new DefaultSerializer()): object {
    const tsToHal = Reflect.getMetadata('halClient:tsToHal', this);
    const result = {};

    for (const prop of props) {
      const jsonKey = tsToHal ? tsToHal[prop] : prop;
      const theProp = this.props[prop];
      if (theProp !== undefined && theProp !== null) {
        result[jsonKey] = this.parseProp(theProp, serializer);
      } else {
        result[jsonKey] = serializer.parseProp(theProp);
      }
    }

    for (const link of links) {
      const jsonKey = tsToHal ? tsToHal[link] : link;
      const theLink = this.links[link] as IHalResource
      result[jsonKey] = Array.isArray(theLink) ?
        theLink.map((link: IHalResource) => serializer.parseResource(link)) :
        serializer.parseResource(theLink);
    }
    return result;
  }

  private parseProp(theProp: any, serializer: IJSONSerializer): unknown {
    let result: unknown;
    if (theProp instanceof HalResource) {
      result = serializer.parseResource(theProp as IHalResource);
    } else if (Array.isArray(theProp)) {
      result = theProp.map((prop: any) => this.parseProp(prop, serializer));
    } else {
      result = serializer.parseProp(theProp);
    }
    return result;
  }
  //#endregion
}
