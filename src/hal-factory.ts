import { AxiosRequestConfig } from 'axios';
import { HalCache } from './hal-cache';
import { IHalCache } from './hal-cache.interface';
import { HalResource } from './hal-resource';
import { IHalResource, IHalResourceConstructor } from './hal-resource-interface';
import { HalRestClient } from './hal-rest-client';
import { IHalRestClient } from './hal-rest-client.interface';
import { URI } from './uri';

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
 * @param c
 * @param uri
 * @returns
 */
export function createResource<T extends IHalResource>(
  client: IHalRestClient,
  c: IHalResourceConstructor<T>,
  uri?: string | URI): T {

  let result: T

  if (!uri) {
    result = new c(client);
  } else if (uri instanceof URI && (uri.templated || !uri.uri)) {
    result = new c(client, uri);
  } else {
    const objectURI = typeof uri === 'string' ? new URI(uri, false) : uri;
    const cacheKey = objectURI.uri.toLowerCase().startsWith('http') ?
      objectURI.uri :
      `${client.config.baseURL}${objectURI.uri}`;
    // console.log(`key ${cacheKey} ${cache.hasResource(cacheKey) ? 'is' : 'is not'} in cache`)
    if (!cache.hasResource(cacheKey)) {
      result = new c(client, objectURI);
      cache.setResource(cacheKey, result);
    } else {
      const cached = cache.getResource(cacheKey) as any;
      result = cached instanceof c ? cached : HalResource.createFromExisting(cached, c);
    }
  }
  return result;
}
