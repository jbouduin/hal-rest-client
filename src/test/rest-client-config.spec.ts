import { AxiosResponse } from 'axios';
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
  });

  const createScope = () => {
    const scope = nock(baseUri, {
      reqheaders: {
        authorization: 'Basic Auth',
      },
    });

    scope
      .get(me.relativeUri)
      .reply(200, me.data);
    return scope;
  };
  test('pass header in constructor', () => {
    const scope = createScope();
    return createClient(baseUri, { headers: { authorization: 'Basic Auth' } })
      .fetch(me.relativeUri, HalResource)
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('Johan');
        scope.done();
      });
  });

  test('configure header using axios configuration', () => {
    const scope = createScope();
    const client = createClient(baseUri);
    client.config.headers.common.authorization = 'Basic Auth';
    return client
      .fetch(me.relativeUri, HalResource)
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('Johan');
        scope.done();
      });
  });

  test('configure header using addHeader method', () => {
    const scope = createScope();
    return createClient(baseUri)
      .addHeader('authorization', 'Basic Auth')
      .fetch(me.relativeUri, HalResource)
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('Johan');
        scope.done();
      });
  });

  test('use request interceptor', () => {
    const scope = createScope();
    const client = createClient(baseUri)
      .addHeader('authorization', 'Basic Auth');
    client.requestInterceptors.use((config) => {
      config.url += '/1';
      return config;
    });
    const uri = uriBuilder.resourceUri('org', true, 'profiles');
    return client
      .fetch(uri, HalResource)
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('Johan');
        scope.done();
      });
  });

  test('use response interceptor', () => {
    const scope = createScope();
    const client = createClient(baseUri)
      .addHeader('authorization', 'Basic Auth');
    client.responseInterceptors.use((response: AxiosResponse<any, any>) => {
      response.data.name = 'You\'ve been hacked';
      return response;
    });
    return client
      .fetch(me.fullUri, HalResource)
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('You\'ve been hacked');
        scope.done();
      });
  });
});
