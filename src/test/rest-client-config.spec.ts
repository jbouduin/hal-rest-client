import * as nock from 'nock';
import { createClient, HalResource, cache } from '..';
import { DataFactory } from './data/data-factory';
import { UriBuilder } from './data/uri-builder';

//#region setup/teardown ------------------------------------------------------
afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('test request headers and interceptor', () => {
  const uriBuilder = new UriBuilder();
  const dataFactory = new DataFactory(uriBuilder);
  const baseUri = uriBuilder.orgBaseURI;
  const me = dataFactory.createResourceData('org', 'profiles', 1, { name: 'Johan' });

  beforeAll(() => {
    nock.cleanAll();
    cache.reset();

    const scope = nock(baseUri, {
      reqheaders: {
        authorization: 'Basic Auth',
      },
    }).persist();

    scope
      .get(me.resourceUri)
      .reply(200, me.result);

  });

  test('pass header in constructor', () => {
    return createClient(baseUri, { headers: { authorization: 'Basic Auth' } })
      .fetch(me.resourceUri, HalResource)
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('Johan');
      });
  });

  test('configure header using axios configuration', () => {
    const client = createClient(baseUri);
    client.config.headers.common.authorization = 'Basic Auth';
    return client
      .fetchResource(me.resourceUri)
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('Johan');
      });
  });

  test('configure header using addHeader method', () => {
    return createClient(baseUri)
      .addHeader('authorization', 'Basic Auth')
      .fetchResource(me.resourceUri)
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('Johan');
      });
  });

  test('use interceptor', () => {
    const client = createClient(baseUri)
      .addHeader('authorization', 'Basic Auth');
    client.interceptors.request.use((config) => {
      config.url += '/1';
      return config;
    });
    const uri = uriBuilder.resourceUri('org', true, 'profiles');
    return client
      .fetchResource(uri)
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('Johan');
      });
  });
});