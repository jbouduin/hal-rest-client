import { create } from 'domain';
import * as nock from 'nock';
import { cache, createClient, createResource, HalResource, UriData } from '..';
import { SimpleFactory } from './data/simple-factory';

import { UriBuilder } from './data/uri-builder';
import { SimpleListModel, SimpleModel } from './models';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  cache.reset();
});

afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('uri data when creating resources', () => {
  const uriBuilder = new UriBuilder();
  const client = createClient(uriBuilder.orgBaseURI);
  const simpleFactory = new SimpleFactory(uriBuilder);

  test('create without uri and fetch', () => {
    expect.assertions(7);
    const resource = createResource(client, SimpleModel);
    const uri = resource['_uri'];
    expect(uri.href).toBeUndefined();
    expect(uri.templated).toBe<boolean>(false)
    expect(uri.receivedUri).toBeUndefined();
    expect(uri.requestedUri).toBeUndefined();
    expect(uri.type).toBeUndefined();
    expect(uri.resourceUri).toBeUndefined();
    return resource
      .fetch()
      .catch((e) => {
        expect(e.message).toBeDefined();
      });
  });

  test('create with non-templated uri (templated: undefined) and fetch', () => {
    const simple = simpleFactory.getSimpleData();
    const resource = createResource(client, SimpleModel, simple.relativeUri);
    const uri = resource['_uri'];
    expect(uri.href).toBe<string>(simple.relativeUri);
    expect(uri.templated).toBe<boolean>(false)
    expect(uri.receivedUri).toBeUndefined();
    expect(uri.requestedUri).toBeUndefined();
    expect(uri.type).toBeUndefined();
    expect(uri.resourceUri).toBe<string>(simple.relativeUri);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(simple.relativeUri)
      .reply(200, simple.data);

    return resource
      .fetch()
      .then((model: SimpleModel) => {
        expect(model.id).toBe<number>(simpleFactory.id);
        expect(model.name).toBe<string>(simpleFactory.savedName);
        expect(model).toBe(resource);
        expect(uri.href).toBe<string>(simple.relativeUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(simple.fullUri);
        expect(uri.requestedUri).toBe<string>(simple.relativeUri);
        expect(uri.type).toBeUndefined();
        expect(uri.resourceUri).toBe<string>(simple.relativeUri);
      });
  });

  test('create with non-templated uri (templated: false) and fetch', () => {
    const simple = simpleFactory.getSimpleData();
    const resource = createResource(client, SimpleModel, simple.relativeUri, false);
    const uri = resource['_uri'];
    expect(uri.href).toBe<string>(simple.relativeUri);
    expect(uri.templated).toBe<boolean>(false)
    expect(uri.receivedUri).toBeUndefined();
    expect(uri.requestedUri).toBeUndefined();
    expect(uri.type).toBeUndefined();
    expect(uri.resourceUri).toBe<string>(simple.relativeUri);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(simple.relativeUri)
      .reply(200, simple.data);

    return resource
      .fetch()
      .then((model: SimpleModel) => {
        expect(model.id).toBe<number>(simpleFactory.id);
        expect(model.name).toBe<string>(simpleFactory.savedName);
        const modelUri = model['_uri'];
        expect(modelUri.href).toBe<string>(simple.relativeUri);
        expect(modelUri.templated).toBe<boolean>(false)
        expect(modelUri.receivedUri).toBe<string>(simple.fullUri);
        expect(modelUri.requestedUri).toBe<string>(simple.relativeUri);
        expect(modelUri.type).toBeUndefined();
        expect(modelUri.resourceUri).toBe<string>(simple.relativeUri);
      });
  });

  test('create with templated uri and fetch', () => {
    const simpleListData = simpleFactory.getSimpleListData();
    const simpleData = simpleFactory.getSimpleData();
    const defaultParameters = uriBuilder.getDefaultQueryParameters();

    const resource = createResource(client, SimpleListModel, simpleListData.relativeTemplateUri, true);
    const uri = resource['_uri'];
    expect(uri.href).toBe<string>(simpleListData.relativeTemplateUri);
    expect(uri.templated).toBe<boolean>(true)
    expect(uri.receivedUri).toBeUndefined();
    expect(uri.requestedUri).toBeUndefined();
    expect(uri.type).toBeUndefined();
    expect(uri.resourceUri).toBeUndefined();
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(simpleListData.relativeUri)
      .reply(200, simpleListData.data)

    return resource
      .fetch(defaultParameters)
      .then((list: SimpleListModel) => {
        expect(list.count).toBe<number>(1);
        expect(list.offset).toBe<number>(0);
        expect(list.pageSize).toBe<number>(20);
        expect(list.results).toHaveLength(1);
        const listUri = list['_uri'] as UriData;
        expect(listUri.href).toBe<string>(simpleListData.relativeTemplateUri)
        expect(listUri.templated).toBe<boolean>(true);
        expect(listUri.receivedUri).toBe<string>(simpleListData.fullUri);
        expect(listUri.requestedUri).toBe<string>(simpleListData.relativeUri);
        expect(listUri.type).toBeUndefined();
        expect(listUri.resourceUri).toBe<string>(simpleListData.relativeUri);
        const model = list.results[0];
        expect(model).toBeInstanceOf(SimpleModel);
        expect(model.id).toBe<number>(simpleFactory.id);
        expect(model.name).toBe<string>(simpleFactory.savedName);
        const modelUri = model['_uri'] as UriData;
        expect(modelUri.href).toBe<string>(simpleData.fullUri)
        expect(modelUri.templated).toBe<boolean>(false);
        expect(modelUri.receivedUri).toBeUndefined();
        expect(modelUri.requestedUri).toBe<string>(simpleListData.relativeUri);
        expect(modelUri.type).toBeUndefined();
        expect(modelUri.resourceUri).toBe<string>(simpleData.fullUri);
      });
  });

  test('jumpTo link fetching', () => {
    const startListData = simpleFactory.getSimpleListData(0);
    const offsetListData = simpleFactory.getSimpleListData(666);
    const defaultParameters = uriBuilder.getDefaultQueryParameters();

    const resource = createResource(client, SimpleListModel, startListData.relativeTemplateUri, true);
    const uri = resource['_uri'];
    expect(uri.href).toBe<string>(startListData.relativeTemplateUri);
    expect(uri.templated).toBe<boolean>(true)
    expect(uri.receivedUri).toBeUndefined();
    expect(uri.requestedUri).toBeUndefined();
    expect(uri.type).toBeUndefined();
    expect(uri.resourceUri).toBeUndefined();
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(startListData.relativeUri)
      .reply(200, startListData.data);
    scope
      .get(simpleFactory.getJumpToTemplate(true, 666))
      .reply(200, offsetListData.data);

    return resource
      .fetch(defaultParameters)
      .then((list: SimpleListModel) => {
        const jumpTo = list.jumpTo
        const jumpToUri = jumpTo['_uri'] as UriData;
        expect(jumpToUri.href).toBe<string>(simpleFactory.getJumpToTemplate(false));
        expect(jumpToUri.templated).toBe<boolean>(true);
        expect(jumpToUri.receivedUri).toBeUndefined;
        expect(jumpToUri.requestedUri).toBeUndefined;
        expect(jumpToUri.type).toBeUndefined();
        expect(jumpToUri.resourceUri).toBeUndefined();

        return jumpTo
          .fetch({ jumpTo: 666 })
          .then((jumped: SimpleListModel) => {
            expect(jumpTo).toBe(jumped);
            expect(jumped.count).toBe<number>(1);
            expect(jumped.offset).toBe<number>(666);
            expect(jumped.pageSize).toBe<number>(20);
            expect(jumped.results).toHaveLength(1);
            const jumpedUri = jumped['_uri'] as UriData;
            expect(jumpedUri.href).toBe<string>(simpleFactory.getJumpToTemplate(false))
            expect(jumpedUri.templated).toBe<boolean>(true);
            expect(jumpedUri.receivedUri).toBe<string>(simpleFactory.getJumpToTemplate(false, 666));
            expect(jumpedUri.requestedUri).toBe<string>(simpleFactory.getJumpToTemplate(false, 666));
            expect(jumpedUri.type).toBeUndefined();
            expect(jumpedUri.resourceUri).toBe<string>(simpleFactory.getJumpToTemplate(false, 666));
          });
      });
  });

  test.todo('create using client and receive model back');

});

describe('uri data after updating a resource', () => {
  test.todo('update using client.update method');
  test.todo('update using resource.update method');
});

describe('redirect on halresource methods', () => {

  const uriBuilder = new UriBuilder();
  const nameSubmitted = 'FANNY';
  const nameSaved = 'Fanny';
  const id = 69;
  const request = { name: nameSubmitted }

  test('redirect to same host on halresource create', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const endpoint = uriBuilder.resourceUri('org', true, 'persons');
    const redirectedEndpointAbsolute = uriBuilder.resourceUri('org', false, 'new-persons');
    const redirectedEndpointRelative = uriBuilder.resourceUri('org', true, 'new-persons');
    const href = uriBuilder.resourceUri('org', false, 'new-persons', id);

    const resourceResponse = {
      id: id,
      name: nameSaved,
      _links: {
        self: { href: href }
      }
    };

    const resource = createResource(client, HalResource, endpoint);
    resource.setProp('name', nameSubmitted);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .intercept(endpoint, 'POST', request)
      .reply(307, undefined, { Location: redirectedEndpointAbsolute });
    scope
      .post(redirectedEndpointRelative, request)
      .reply(200, resourceResponse);

    return resource.create(SimpleModel).then((response: SimpleModel) => {
      // console.log(response.uri);
      scope.done();
    });
  });

  test('redirect to different host on halresource create', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const endpoint = uriBuilder.resourceUri('org', true, 'persons');
    const redirectedEndpointAbsolute = uriBuilder.resourceUri('com', false, 'new-persons');
    const redirectedEndpointRelative = uriBuilder.resourceUri('com', true, 'new-persons');
    const href = uriBuilder.resourceUri('com', false, 'new-persons', id);

    const resourceResponse = {
      id: id,
      name: nameSaved,
      _links: {
        self: { href: href }
      }
    };

    const resource = createResource(client, HalResource, endpoint);
    resource.setProp('name', nameSubmitted);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .intercept(endpoint, 'POST', request)
      .reply(307, undefined, { Location: redirectedEndpointAbsolute });

    const scope2 = nock(uriBuilder.comBaseURI)
    scope2
      .post(redirectedEndpointRelative, request)
      .reply(200, resourceResponse);

    return resource.create(SimpleModel).then((response: SimpleModel) => {
      // console.log(response.uri);
      scope.done();
    });
  });

  test.todo('redirect to same host on halresource fetch');
  test.todo('redirect to different host on halresource fetch');

  test.todo('redirect to same host on halresource update');
  test.todo('redirect to different host on halresource update');

  test.todo('redirect to same host on halresource delete');
  test.todo('redirect to different host on halresource delete');

});

describe('redirect on hal-rest-client', () => {

  test.todo('redirect to same host on hal-rest-client create');
  test.todo('redirect to different host on hal-rest-client create');

  test.todo('redirect to same host on hal-rest-client update');
  test.todo('redirect to different host on hal-rest-client update');

  test.todo('redirect to same host on hal-rest-client fetch');
  test.todo('redirect to different host on hal-rest-client fetch');

  test.todo('redirect to same host on halresource update');
  test.todo('redirect to different host on halresource update');

  test.todo('redirect to same host on halresource delete');
  test.todo('redirect to different host on halresource delete');

});