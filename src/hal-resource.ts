import { DefaultSerializer, IJSONSerializer } from "./hal-json-serializer";
import { IHalResource, IHalResourceConstructor } from "./hal-resource.interface";
import { HalRestClient } from "./hal-rest-client";
import { IHalRestClient } from "./hal-rest-client.interface";
import { URI } from "./uri";

export class HalResource implements IHalResource {

  //#region Private properties ------------------------------------------------
  private readonly settedProps: Array<string>;
  private readonly settedLinks: Array<string>;
  private initEnded = false;
  private links: Record<string, IHalResource | Array<IHalResource>>;
  private props: Record<string, unknown>;
  //#endregion

  //#region protected properties ----------------------------------------------
  // TODO can't these be private ?
  protected _uri?: URI;
  public restClient: IHalRestClient;
  //#endregion

  //#region public properties -------------------------------------------------
  public get hasChanges(): boolean {
    return this.settedLinks.length + this.settedProps.length > 0;
  }
  // TODO 1663 refactor HalResource: should be a public get private/internal set (it is only set by the JSON Parser)
  public isLoaded = false;
  //#endregion

  //#region IHalResource interface members ------------------------------------
  // TODO can't we make it readonly only the parser is setting it to put 'self'? other possibility is to make the parser passing the uri in the constructor
  public set uri(uri: URI) {
    this._uri = uri;
  }

  public get uri(): URI {
    return this._uri;
  }
  //#endregion

  //#region Constructor & C° --------------------------------------------------
  public constructor(restClient: IHalRestClient, uri?: URI) {
    this.restClient = restClient;
    this._uri = uri;
    this.links = {};
    this.props = {};
    this.settedLinks = new Array<string>();
    this.settedProps = new Array<string>();
  }

  public static createFromExisting<T extends HalResource>(existing: T, type: IHalResourceConstructor<T>): T {
    const result = new type(existing.restClient, existing.uri);
    result.links = existing.links;
    result.props = existing.props;
    result.settedLinks.push(...existing.settedLinks);
    result.settedProps.push(...existing.settedProps);
    return result;
  }
  //#endregion

  //#region IHalResource methods ----------------------------------------------
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

  public setLink(name: string, value?: IHalResource | Array<IHalResource> ): void {
    if (this.links[name] !== value) {
      this.links[name] = value;
      if (this.initEnded) {
        this.settedLinks.push(name);
      }
    }
  }

  public getLink<T = IHalResource | Array<IHalResource>>(name: string): T  {
    return (this.links[name] as unknown) as T;
  }

  public delete<T extends IHalResource>(type?: IHalResourceConstructor<T>): Promise<T | Record<string, any>> {
    return this.restClient.delete(this, type);
  }

  // TODO this is only used by parser, check if we can hide it
  public onInitEnded() {
    this.initEnded = true;
  }

  public update<T extends IHalResource>(type?: IHalResourceConstructor<T>, serializer?: IJSONSerializer): Promise<T | Record<string, any>> {
    const json = this.serialize(this.settedProps, this.settedLinks, serializer);
    return this.restClient
      .update(this.uri.resourceURI, json, false, type)
      .then((response: T) => {
        this.clearChanges();
        return response;
      });
  }


  public create<T extends IHalResource>(type?: IHalResourceConstructor<T>, serializer?: IJSONSerializer): Promise<T | Record<string, any>> {
    const json = this.serialize(Object.keys(this.props), Object.keys(this.links), serializer);
    return this.restClient
      .create(this.uri.resourceURI, json, type)
      .then((response: T) => {
        this.clearChanges();
        return response;
      });
  }

  //TODO only used by parser after eventually loading from cache
  public reset(): void {
    Object.keys(this.props).forEach((prop) => {
      delete this.props[prop];
    });

    Object.keys(this.links).forEach((prop) => {
      delete this.props[prop];
    });
  }

  // TODO this is for internal use only
  public clearChanges(): void {
    this.settedLinks.length = 0;
    this.settedProps.length = 0;
  }
  //#endregion

  /**
   * get the service prop name corresponding to ts attribute name
   */
  // TODO only used in serialize, will read metadata for every property
  protected tsProptoHalProd(prop: string) {
    const tsToHal = Reflect.getMetadata("halClient:tsToHal", this);
    return tsToHal ? tsToHal[prop] : prop;
  }

  /**
   * serialize this object to json
   */
  private serialize(props: Array<string>, links: Array<string>, serializer: IJSONSerializer = new DefaultSerializer()): object {
    const json = {};

    for (const prop of props) {
      const jsonKey = this.tsProptoHalProd(prop);
      if (this.props[prop] !== undefined && this.props[prop] !== null && this.props[prop] instanceof HalResource) {
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
