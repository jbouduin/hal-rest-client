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
 * create hal rest client
 * if a client with same base uri already exists, same client is returned
 *
 */
export function createClient(baseUri?: string, options: AxiosRequestConfig = {}): IHalRestClient {
  let result: IHalRestClient;
  if (!baseUri) {
    result = new HalRestClient();
  } else {
    while (baseUri.endsWith('/')) {
      baseUri = baseUri.slice(0, -1);
    }
    if (!cache.hasClient(baseUri)) {
      result = new HalRestClient(baseUri, options);
      cache.setClient(baseUri, result);
    } else {
      result = cache.getClient(baseUri);
    }
  }
  return result;
}

/**
 * Create a HalResource of the given type. If no uri is specified, an 'empty' resource is created.
 * If uri is a URI and it is templated, the resource is created without caching it.
 * Otherwise the cache is searched for an existing entry. If found and of the correct type it is returned.
 * If found and of the wrong type, an exception is thrown.
 * If not found, it is created and cached
 * @param client
 * @param resourceType
 * @param uri
 * @returns
 */
export function createResource<T extends IHalResource>(
  client: IHalRestClient,
  resourceType: IHalResourceConstructor<T>,
  uri?: string,
  templated = false): T {
  const uriData = new UriData(uri, templated);
  return createResourceInternal(client, resourceType, uriData);
}

/** @internal */
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
