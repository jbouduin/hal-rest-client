import { AxiosRequestConfig } from 'axios';
import { HalResource } from './hal-resource';
import { IHalResource, IHalResourceConstructor } from './hal-resource-interface';
import { HalRestClient } from './hal-rest-client';
import { URI } from './uri';

const cachedClients = new Map<string, HalRestClient>();
const cachedResources = new Map<string, IHalResource>();

export type CacheType = 'Client' | 'Resource';

/**
 * create hal rest client
 * if a client with same base already exists, same client is returned
 *
 */
export function createClient(basename?: string, options: AxiosRequestConfig = {}): HalRestClient {
  let result: HalRestClient;
  if (!basename) {
    result = new HalRestClient();
  } else if (!cachedClients.has(basename)) {
    result = new HalRestClient(basename, options);
    cachedClients.set(basename, result);
  } else {
    result = cachedClients.get(basename);
  }
  return result;
}

/**
 * create HalResource
 */

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
  client: HalRestClient,
  c: IHalResourceConstructor<T>,
  uri?: string | URI): T {

  let result: T

  if (!uri) {
    result = new c(client);
  } else if (uri instanceof URI && uri.templated) {
    result = new c(client, uri);
  } else {
    const objectURI = typeof uri === 'string' ? new URI(uri, false) : uri;
    if (!cachedResources.has(objectURI.uri)) {
      result = new c(client, objectURI);
      cachedResources.set(objectURI.uri, result);
    } else {
      const cached = cachedResources.get(objectURI.uri) as any;
      result = cached instanceof c ? cached : HalResource.createFromExisting(cached, c);
    }
  }
  return result;
}

/**
 * Clear the cache for clients and/or resources
 * @param type the type of cache to clear. If not specified both are cleared
 */
export function resetCache(type?: CacheType) {
  if (!type || type === 'Client') {
    cachedClients.clear();
  }
  if (!type || type === 'Resource') {
    cachedResources.clear();
  }
}

/**
 * Get the key of the cached client resp. resources
 * @param type the type of cache
 * @returns an array strings
 */
export function getCacheKeys(type: CacheType): Array<string> {
  let result: Array<string>;
  switch (type) {
    case 'Client':
      result = Array.from(cachedClients.keys());
      break;
    case 'Resource':
      result = Array.from(cachedResources.keys())
    default:
      break;
  }
  return result;
}