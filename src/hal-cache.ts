
import { IHalResource } from "./hal-resource-interface";
import { HalRestClient } from "./hal-rest-client";

export type HalCacheType = 'Client' | 'Resource';

export interface IHalCache {
  /**
   * Selective purge of a cache
   * @param type
   * @param key a key or array of keys or a regular expression to find the keys to be purged
   * @returns an array of keys that have been purged
   */
  clear(type: HalCacheType, key: string | Array<string> | RegExp): Array<string>;

  /**
   * Clear the cache for clients and/or resources
   * @param type the type of cache to clear. If not specified both are cleared
  */
  reset(type?: HalCacheType): void;

  /**
   * Get the key of the cached client resp. resources
   * @param type the type of cache
   * @returns an array strings
   */
  getKeys(type: HalCacheType): Array<string>;


  getClient(uri: string): HalRestClient;
  hasClient(uri: string): boolean;
  setClient(uri: string, value: HalRestClient): void;
  getResource(uri: string): IHalResource;
  hasResource(uri:string): boolean;
  setResource(uri: string, value: IHalResource): void;
}

export class HalCache implements IHalCache {
  private clientCache: Map<string, HalRestClient>;
  private resourceCache: Map<string, IHalResource>;

  constructor() {
    this.clientCache = new Map<string, HalRestClient>();
    this.resourceCache = new Map<string, IHalResource>();
  }

  /**
   * Clear the cache for clients and/or resources
   * @param type the type of cache to clear. If not specified both are cleared
  */
  public reset(type?: HalCacheType): void {
    if (!type || type === 'Client') {
      this.clientCache.clear();
    }
    if (!type || type === 'Resource') {
      this.resourceCache.clear();
    }
  }

  /**
 * Get the key of the cached client resp. resources
 * @param type the type of cache
 * @returns an array strings
 */
  public getKeys(type: HalCacheType): Array<string> {
    let result: Array<string>;
    switch (type) {
      case 'Client':
        result = Array.from(this.clientCache.keys());
        break;
      case 'Resource':
        result = Array.from(this.resourceCache.keys());
        break;
      default:
        break;
    }
    return result;
  }

  public clear(type: HalCacheType, key: string | RegExp): Array<string> {
    const keysToClear= new Array<string>();
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
      if (cacheToClear.delete(key)){
        result.push(key);
      }
    });
    return result;
  }

  public getClient(uri: string): HalRestClient {
    return this.clientCache.get(uri);
  }

  public hasClient(uri: string): boolean {
    return this.clientCache.has(uri);
  }

  public setClient(uri: string, value: HalRestClient): void {
    this.clientCache.set(uri, value);
  }

  public hasResource(uri: string): boolean {
    return this.resourceCache.has(uri);
  }

  public getResource(uri: string): IHalResource {
    return this.resourceCache.get(uri);
  }

  public setResource(uri: string, value: IHalResource): void {
    this.resourceCache.set(uri, value);
  }
}