
import { IHalResource } from "./hal-resource.interface";
import { IHalRestClient } from "./hal-rest-client.interface";

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


  getClient(uri: string): IHalRestClient;
  hasClient(uri: string): boolean;
  setClient(uri: string, value: IHalRestClient): void;
  getResource(uri: string): IHalResource;
  hasResource(uri: string): boolean;
  setResource(uri: string, value: IHalResource): void;
}

