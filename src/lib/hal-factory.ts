import { AxiosRequestConfig } from 'axios';
import { HalCache } from './hal-cache';
import { IHalCache } from './hal-cache.interface';
import { IHalResource, IHalResourceConstructor } from './hal-resource.interface';
import { HalRestClient } from './hal-rest-client';
import { IHalRestClient } from './hal-rest-client.interface';
import { UriData } from './uri-data';

/** The cache containing instantiated clients and resources */
export const cache: IHalCache = new HalCache();

/**
 * Create hal rest client
 * If no baseUri is provided, a new HalRestClient is created.
 * Othwerise, if a client with same base uri already exists, it is retrieved from the cache and returned.
 * If it does not exists yet, a new client is created. If the cached parameter is not set to false this new client is cached.
 *
 * @param {string} baseUri - the baseUri that will be used to configure Axios.
 * @param {AxiosRequestConfig} options - the options that will be passed to Axios
 * @param {boolean} cached - if set to false, the client will not be added to the cache. Remark: even if set to false, an existing cached entry will be returned.
 * Defaults to 'false'
 * @returns {IHalRestClient} - a IHalrestClient
 */
export function createClient(baseUri?: string, options: AxiosRequestConfig = {}, cached = true): IHalRestClient {
  let result: IHalRestClient;
  if (!baseUri) {
    result = new HalRestClient();
  } else {
    while (baseUri.endsWith('/')) {
      baseUri = baseUri.slice(0, -1);
    }
    if (!cache.hasClient(baseUri)) {
      result = new HalRestClient(baseUri, options);
      if (cached) {
        cache.setClient(baseUri, result);
      }
    } else {
      result = cache.getClient(baseUri);
    }
  }
  return result;
}

/**
 * Create a HalResource of the given type. If no uri is specified, an 'empty' resource is created.
 * If templated, the resource is created without caching it.
 * Otherwise the cache is searched for an existing entry. If found it is returned, eventually converting it to the requested type.
 * If not found, it is created and cached.
 *
 * @template T - extends IHalResource
 * @param {IHalRestClient} client - the HalRestClient connected to the resource
 * @param {T} resourceType - the type of resource. If no model is defined, use HalResource
 * @param {string} uri - the URI of the resources
 * @param {templated} templated - indicates if the uri of the resource is templated one
 * @returns {T} - the requested Resource
 */
export function createResource<T extends IHalResource>(
  client: IHalRestClient,
  resourceType: IHalResourceConstructor<T>,
  uri?: string,
  templated = false): T {
  const uriData = new UriData(uri, templated);
  return createResourceInternal(client, resourceType, uriData);
}

/**
 * Internal function to create a Halresource. Do not call it directly
 *
 * @internal
 * @template T - extends IHalResource
 * @param {IHalRestClient} client - the HalRestClient connected to the resource
 * @param {T} resourceType - the type of resource. If no model is defined, use HalResource
 * @param {UriData} uri - the UriData of the resource
 * @returns {T} - the requested Resource
 */
export function createResourceInternal<T extends IHalResource>(
  client: IHalRestClient,
  resourceType: IHalResourceConstructor<T>,
  uri: UriData) {
  let result: T

  if (uri.templated) {
    result = new resourceType(client, uri);
  } else {
    const cacheKey = uri.calculateCacheKey(client.config.baseURL);
    // console.log(`key ${cacheKey} ${cache.hasResource(cacheKey) ? 'is' : 'is not'} in cache`)
    if (cacheKey) {
      if (cache.hasResource(cacheKey)) {
        const cached = cache.getResource(cacheKey);
        cached.setUri(uri);
        if (!(cached instanceof resourceType)) {
          result = cached.convert(resourceType);
          cache.setResource(cacheKey, result);
        } else {
          result = cached;
        }
      } else {
        result = new resourceType(client, uri);
        cache.setResource(cacheKey, result);
      }
    } else {
      result = new resourceType(client, uri);
    }
  }
  return result;
}
