
import { IHalResource } from "./hal-resource.interface";
import { IHalRestClient } from "./hal-rest-client.interface";

export type HalCacheType = 'Client' | 'Resource';

export interface IHalCache {

  readonly isEnabled: boolean;

  /**
   * Enables the cache
   */
  enable(): void;

  /**
   * Disables the cache and clears all the contents
   */
  disable(): void;

  /**
   * Selective purge of a cache. To clear the cache completely use reset.
   *
   * @param {HalCacheType } type - the type of cache
   * @param {string | Array<string> | RegExp} key - the key, an array of keys or a regular expression to find the keys to be purged
   * @returns {Array<string>} - the keys of the clients/resources removed from the cache
   */
  clear(type: HalCacheType, key: string | Array<string> | RegExp): Array<string>;

  /**
   * Clear the cache for clients and/or resources
   *
   * @param type the type of cache to clear. If not specified both are cleared
   */
  reset(type?: HalCacheType): void;

  /**
   * Get the key of the cached client resp. resources
   *
   * @param {HalCacheType } type - the type of cache
   * @returns {Array<string>} the keys of cached clients/resources
   */
  getKeys(type: HalCacheType): Array<string>;


  getClient(uri: string): IHalRestClient;
  hasClient(uri: string): boolean;
  setClient(uri: string, value: IHalRestClient): void;
  getResource(uri: string): IHalResource;
  hasResource(uri: string): boolean;
  setResource(uri: string, value: IHalResource): void;
}

