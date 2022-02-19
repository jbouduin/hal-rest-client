import { HalCacheType, IHalCache } from "./hal-cache.interface";
import { IHalResource } from "./hal-resource.interface";
import { IHalRestClient } from "./hal-rest-client.interface";

/** @internal */
export class HalCache implements IHalCache {
  //#region private properties ------------------------------------------------
  private clientCache: Map<string, IHalRestClient>;
  private resourceCache: Map<string, IHalResource>;
  private _isEnabled: boolean;
  //#endregion

  //#region IHalCache properties ----------------------------------------------
  public get isEnabled(): boolean {
    return this._isEnabled;
  }
  //#endregion
  //#region Constructor & C° --------------------------------------------------
  constructor() {
    this.clientCache = new Map<string, IHalRestClient>();
    this.resourceCache = new Map<string, IHalResource>();
    this._isEnabled = true;
  }
  //#endregion

  //#region IHalCach interface methods ----------------------------------------
  public enable(): void {
    this._isEnabled = true;
  }

  public disable(): void {
    this._isEnabled = false;
    this.reset();
  }

  public reset(type?: HalCacheType): void {
    if (!type || type === 'Client') {
      this.clientCache.clear();
    }
    if (!type || type === 'Resource') {
      this.resourceCache.clear();
    }
  }

  public getKeys(type: HalCacheType): Array<string> {
    let result: Array<string>;
    if (type === 'Client') {
      result = Array.from(this.clientCache.keys());
    } else {
      result = Array.from(this.resourceCache.keys());
    }
    return result;
  }

  public clear(type: HalCacheType, key: string | RegExp): Array<string> {
    const keysToClear = new Array<string>();
    const cacheToClear = type === 'Client' ? this.clientCache : this.resourceCache;

    if (typeof key === 'string') {
      keysToClear.push(key);
    } else if (Array.isArray(key)) {
      keysToClear.push(...key);
    } else if (key instanceof RegExp) {
      keysToClear.push(...Array.from(cacheToClear.keys()).filter((uri: string) => uri.match(key)));
    }
    const result = new Array<string>();
    keysToClear.forEach((key: string) => {
      if (cacheToClear.delete(key)) {
        result.push(key);
      }
    });
    return result;
  }

  public getClient(uri: string): IHalRestClient {
    return this.clientCache.get(uri);
  }

  public hasClient(uri: string): boolean {
    return this.clientCache.has(uri);
  }

  public setClient(uri: string, value: IHalRestClient): void {
    if (this._isEnabled) {
      this.clientCache.set(uri, value);
    }
  }

  public hasResource(uri: string): boolean {
    return this.resourceCache.has(uri);
  }

  public getResource(uri: string): IHalResource {
    return this.resourceCache.get(uri);
  }

  public setResource(uri: string, value: IHalResource): void {
    if (this._isEnabled) {
      this.resourceCache.set(uri, value);
    }
  }
  //#endregion
}