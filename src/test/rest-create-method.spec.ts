import * as nock from 'nock';
import { createClient, createResource, HalResource } from '..';
import { HostTld } from './data/common-definitions';
import { UriBuilder } from './data/uri-builder';
import { SimpleModel } from './models';

describe('Test Rest create api', () => {
  const contextTld: HostTld = 'org';
  const uriBuilder = new UriBuilder();
  const nameSubmitted = 'FANNY';
  const nameSaved = 'Fanny';
  const id = 69;
  const endpoint = uriBuilder.resourceUri(contextTld, true, 'persons');
  const personUri = uriBuilder.resourceUri(contextTld, false, 'persons', id);
  const request = { name: nameSubmitted }
  const resourceResponse = {
    id: id,
    name: nameSaved,
    _links: {
      self: { href: personUri }
    }
  };
  const jsonResponse = { status: 'OK' };

  const testHalResource = (resource: HalResource) => {
    expect(resource.getProperty('name')).toBe<string>(nameSaved);
    expect(resource.getProperty('id')).toBe<number>(id);
    expect(resource.uri.resourceUri).toBe<string>(personUri);
    expect(resource['_uri'].href).toBe<string>(personUri);
  };

  const testModel = (model: SimpleModel) => {
    expect(model.getProperty('name')).toBe<string>(nameSaved);
    expect(model.name).toBe<string>(nameSaved);
    expect(model.getProperty('id')).toBe<number>(id);
    expect(model.id).toBe<number>(id);
    expect(model.uri.resourceUri).toBe<string>(personUri);
    expect(model['_uri'].href).toBe<string>(personUri);
  };

  test('create person using Halresource and receive halresource back', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const resource = createResource(client, HalResource, endpoint);
    resource.setProperty('name', nameSubmitted);
    const scope = nock(uriBuilder.orgBaseURI)
      .post(endpoint, { name: nameSubmitted })
      .reply(200, resourceResponse);

    return resource.create(HalResource).then((response: HalResource) => {
      testHalResource(response);
      scope.done();
    });
  });

  test('create person using Halresource and receive personmodel back', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const resource = createResource(client, HalResource, endpoint);
    resource.setProperty('name', nameSubmitted);
    const scope = nock(uriBuilder.orgBaseURI)
      .post(endpoint, { name: nameSubmitted })
      .reply(200, resourceResponse);

    return resource.create(SimpleModel).then((response: SimpleModel) => {
      testModel(response);
      scope.done();
    });
  });

  test('create person using Halresource and receive json back', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const resource = createResource(client, HalResource, endpoint);
    resource.setProperty('name', nameSubmitted);
    const scope = nock(uriBuilder.orgBaseURI)
      .post(endpoint, { name: nameSubmitted })
      .reply(200, jsonResponse);

    return resource.create().then((response: Record<string, any>) => {
      expect(response.status).toBe<string>('OK');
      scope.done();
    });
  });

  test('create person using Halresource and receive status back', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const resource = createResource(client, HalResource, endpoint);
    resource.setProperty('name', nameSubmitted);
    const scope = nock(uriBuilder.orgBaseURI)
      .post(endpoint, { name: nameSubmitted })
      .reply(200);

    return resource.create().then((response: Record<string, any>) => {
      expect(response.status).toBe<number>(200);
      scope.done();
    });
  });

  test('create person using Halrestclient and receive halresource back', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI)
      .post(endpoint, { name: nameSubmitted })
      .reply(200, resourceResponse);

    return client
      .create(endpoint, request, HalResource)
      .then((response: HalResource) => {
        testHalResource(response);
        scope.done();
      });
  });

  test('create person using Halrestclient and receive personmodel back', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI)
      .post(endpoint, { name: nameSubmitted })
      .reply(200, resourceResponse);

    return client
      .create(endpoint, request, SimpleModel)
      .then((response: SimpleModel) => {
        testModel(response);
        scope.done();
      });
  });

  test('create person using Halrestclient and receive json back', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI)
      .post(endpoint, { name: nameSubmitted })
      .reply(200, jsonResponse);

    return client
      .create(endpoint, request)
      .then((response: Record<string, any>) => {
        expect(response.status).toBe<string>('OK');
        scope.done();
      });
  });

  test('create person using Halrestclient and receive status back', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI)
      .post(endpoint, { name: nameSubmitted })
      .reply(200);
    return client
      .create(endpoint, request)
      .then((response: Record<string, any>) => {
        expect(response.status).toBe<number>(200);
        scope.done();
      });
  });


});
