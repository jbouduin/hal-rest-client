import { AxiosRequestConfig } from 'axios';
import { HalCache, IHalCache } from './hal-cache';
import { HalResource } from './hal-resource';
import { IHalResource, IHalResourceConstructor } from './hal-resource-interface';
import { HalRestClient } from './hal-rest-client';
import { URI } from './uri';

export const cache: IHalCache = new HalCache();

/**
 * create hal rest client
 * if a client with same base already exists, same client is returned
 *
 */
export function createClient(basename?: string, options: AxiosRequestConfig = {}): HalRestClient {
  let result: HalRestClient;
  if (!basename) {
    result = new HalRestClient();
  } else if (!cache.hasClient(basename)) {
    result = new HalRestClient(basename, options);
    cache.setClient(basename, result);
  } else {
    result = cache.getClient(basename);
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
    if (!cache.hasResource(objectURI.uri)) {
      result = new c(client, objectURI);
      cache.setResource(objectURI.uri, result);
    } else {
      const cached = cache.getResource(objectURI.uri) as any;
      result = cached instanceof c ? cached : HalResource.createFromExisting(cached, c);
    }
  }
  return result;
}

