import * as nock from 'nock';
import { cache, createClient, createResource } from '..';
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

describe('uri data when fetching resources', () => {
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
    const simple = simpleFactory.createSimpleData();
    const resource = createResource(client, SimpleModel, simple.relativeUri);
    const uri = resource['_uri'];
    expect(uri.href).toBe<string>(simple.relativeUri);
    expect(uri.templated).toBe<boolean>(false)
    expect(uri.receivedUri).toBeUndefined();
    expect(uri.requestedUri).toBeUndefined();
    expect(uri.type).toBeUndefined();
    expect(uri.resourceUri).toBe<string>(simple.relativeUri);
    let cacheKeys = cache.getKeys('Resource');
    expect(cacheKeys).toHaveLength(1);
    expect(cacheKeys[0]).toBe<string>(simple.fullUri);
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
        cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(simple.fullUri);
        scope.done();
      });
  });

  test('create with non-templated uri (templated: false) and fetch', () => {
    const simple = simpleFactory.createSimpleData();
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
        scope.done();
      });
  });

  test('create with templated uri and fetch', () => {
    const simpleListData = simpleFactory.getSimpleListData();
    const simpleData = simpleFactory.createSimpleData();
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
        const listUri = list['_uri'];
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
        const modelUri = model['_uri'];
        expect(modelUri.href).toBe<string>(simpleData.fullUri)
        expect(modelUri.templated).toBe<boolean>(false);
        expect(modelUri.receivedUri).toBeUndefined();
        expect(modelUri.requestedUri).toBe<string>(simpleListData.relativeUri);
        expect(modelUri.type).toBeUndefined();
        expect(modelUri.resourceUri).toBe<string>(simpleData.fullUri);
        scope.done();
      });
  });

  test('jumpTo link fetching', () => {
    const startListData = simpleFactory.getSimpleListData(0);
    const offsetListData = simpleFactory.getSimpleListData(666);
    const defaultParameters = uriBuilder.getDefaultQueryParameters();
    const simplePath = 'simple';
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
      .get(simpleFactory.getJumpToTemplate(true, simplePath, 666))
      .reply(200, offsetListData.data);

    return resource
      .fetch(defaultParameters)
      .then((list: SimpleListModel) => {
        const jumpTo = list.jumpTo
        const jumpToUri = jumpTo['_uri'];
        expect(jumpToUri.href).toBe<string>(simpleFactory.getJumpToTemplate(false, simplePath));
        expect(jumpToUri.templated).toBe<boolean>(true);
        expect(jumpToUri.receivedUri).toBeUndefined();
        expect(jumpToUri.requestedUri).toBeUndefined();
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
            const jumpedUri = jumped['_uri'];
            expect(jumpedUri.href).toBe<string>(simpleFactory.getJumpToTemplate(false))
            expect(jumpedUri.templated).toBe<boolean>(true);
            expect(jumpedUri.receivedUri).toBe<string>(simpleFactory.getJumpToTemplate(false, simplePath, 666));
            expect(jumpedUri.requestedUri).toBe<string>(simpleFactory.getJumpToTemplate(false, simplePath, 666));
            expect(jumpedUri.type).toBeUndefined();
            expect(jumpedUri.resourceUri).toBe<string>(simpleFactory.getJumpToTemplate(false, simplePath, 666));
            scope.done();
          });
      });
  });

  test('fetch using hal-rest-client', () => {
    const simple = simpleFactory.createSimpleData();
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(simple.relativeUri)
      .reply(200, simple.data);

    return client
      .fetch(simple.relativeUri, SimpleModel)
      .then((fetched: SimpleModel) => {
        expect(fetched.id).toBe<number>(simpleFactory.id);
        expect(fetched.name).toBe<string>(simpleFactory.savedName);
        const uri = fetched['_uri'];
        expect(uri.href).toBe<string>(simple.fullUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(simple.fullUri);
        expect(uri.requestedUri).toBe<string>(simple.relativeUri);
        expect(uri.type).toBeUndefined();
        expect(uri.resourceUri).toBe<string>(simple.fullUri);
        scope.done();
      });
  });
});

describe('uri data when updating or creating a resource', () => {
  const uriBuilder = new UriBuilder();
  const client = createClient(uriBuilder.orgBaseURI);
  const simpleFactory = new SimpleFactory(uriBuilder);

  test('create using client', () => {
    const simple = simpleFactory.createSimpleData();
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .post(simple.relativeCreateUri, JSON.stringify(simple.createRequest))
      .reply(200, simple.data);

    return client
      .create<SimpleModel>(simple.relativeCreateUri, simple.createRequest, SimpleModel)
      .then((model: SimpleModel) => {
        expect(model.id).toBe<number>(simpleFactory.id);
        expect(model.name).toBe<string>(simpleFactory.savedName);
        const uri = model['_uri'];
        expect(uri.href).toBe<string>(simple.fullUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(simple.absoluteCreateUri);
        expect(uri.requestedUri).toBe<string>(simple.relativeCreateUri);
        expect(uri.type).toBeUndefined();
        expect(uri.resourceUri).toBe<string>(simple.fullUri);
        scope.done();
      })
  });

  test('create using resource.create', () => {
    const simple = simpleFactory.createSimpleData();
    const client = createClient(uriBuilder.orgBaseURI);
    const resource = createResource(client, SimpleModel, simple.relativeCreateUri);
    resource.name = simpleFactory.sendName;
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .post(simple.relativeCreateUri, JSON.stringify(simple.createRequest))
      .reply(200, simple.data);

    return resource
      .create(SimpleModel).then((created: SimpleModel) => {
        expect(created.id).toBe<number>(simpleFactory.id);
        expect(created.name).toBe<string>(simpleFactory.savedName);
        const uri = created['_uri'];
        expect(uri.href).toBe<string>(simple.fullUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(simple.absoluteCreateUri);
        expect(uri.requestedUri).toBe<string>(simple.relativeCreateUri);
        expect(uri.type).toBeUndefined();
        expect(uri.resourceUri).toBe<string>(simple.fullUri);
        scope.done();
      });
  });

  test('update using client.update method', () => {
    const simple = simpleFactory.createSimpleData();
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .patch(simple.relativeUri, JSON.stringify(simple.updateNameRequest))
      .reply(200, simple.updateNameResponse);

    return client
      .update<SimpleModel>(simple.relativeUri, simple.updateNameRequest, false, SimpleModel)
      .then((model: SimpleModel) => {
        expect(model.id).toBe<number>(simpleFactory.id);
        expect(model.name).toBe<string>(simpleFactory.updatedName);
        const uri = model['_uri'];
        expect(uri.href).toBe<string>(simple.fullUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(simple.fullUri);
        expect(uri.requestedUri).toBe<string>(simple.relativeUri);
        expect(uri.type).toBeUndefined();
        expect(uri.resourceUri).toBe<string>(simple.fullUri);
        scope.done();
      });
  });

  test('update using resource.update method', () => {
    const simple = simpleFactory.createSimpleData();
    const resource = createResource(client, SimpleModel, simple.relativeUri);

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(simple.relativeUri)
      .reply(200, simple.data);
    scope
      .patch(simple.relativeUri, JSON.stringify(simple.updateNameRequest))
      .reply(200, simple.updateNameResponse);

    return resource
      .fetch()
      .then((model: SimpleModel) => {
        model.name = simpleFactory.updatedName;
        return model
          .update(SimpleModel)
          .then((updated: SimpleModel) => {
            expect(updated).toBe(model);
            expect(updated.name).toBe<string>(simpleFactory.updatedName);
            const uri = updated['_uri'];
            expect(uri.href).toBe<string>(simple.fullUri);
            expect(uri.templated).toBe<boolean>(false)
            expect(uri.receivedUri).toBe<string>(simple.fullUri);
            expect(uri.requestedUri).toBe<string>(simple.relativeUri);
            expect(uri.type).toBeUndefined();
            expect(uri.resourceUri).toBe<string>(simple.fullUri);
            scope.done();
          });
      });
  });

});

describe('redirect on halresource methods', () => {
  const uriBuilder = new UriBuilder();
  const orgFactory = new SimpleFactory(uriBuilder, 'org');
  const comFactory = new SimpleFactory(uriBuilder, 'com');

  test('redirect to same host on halresource create', () => {
    const simple = orgFactory.createSimpleData();
    const redirectedSimple = orgFactory.createSimpleData('new-simple');
    const client = createClient(uriBuilder.orgBaseURI);
    const resource = createResource(client, SimpleModel, simple.relativeCreateUri);
    resource.name = orgFactory.sendName;
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .post(simple.relativeCreateUri, JSON.stringify(simple.createRequest))
      .reply(307, undefined, { Location: redirectedSimple.absoluteCreateUri });
    scope
      .post(redirectedSimple.relativeCreateUri, JSON.stringify(simple.createRequest))
      .reply(200, redirectedSimple.data);

    return resource
      .create(SimpleModel)
      .then((created: SimpleModel) => {
        expect(created.id).toBe<number>(orgFactory.id);
        expect(created.name).toBe<string>(orgFactory.savedName);
        const uri = created['_uri'];
        expect(uri.href).toBe<string>(redirectedSimple.fullUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(redirectedSimple.absoluteCreateUri);
        expect(uri.requestedUri).toBe<string>(simple.relativeCreateUri);
        expect(uri.type).toBeUndefined();
        expect(uri.resourceUri).toBe<string>(redirectedSimple.fullUri);
        scope.done();
      });
  });

  test('redirect to different host on halresource create', () => {
    const simple = orgFactory.createSimpleData();
    const redirectedSimple = comFactory.createSimpleData();
    const client = createClient(uriBuilder.orgBaseURI);
    const resource = createResource(client, SimpleModel, simple.relativeCreateUri);
    resource.name = orgFactory.sendName;
    const orgScope = nock(uriBuilder.orgBaseURI);
    orgScope
      .post(simple.relativeCreateUri, JSON.stringify(simple.createRequest))
      .reply(307, undefined, { Location: redirectedSimple.absoluteCreateUri });
    const comScope = nock(uriBuilder.comBaseURI);
    comScope
      .post(redirectedSimple.relativeCreateUri, JSON.stringify(simple.createRequest))
      .reply(200, redirectedSimple.data);

    return resource
      .create(SimpleModel).then((created: SimpleModel) => {
        expect(created.id).toBe<number>(orgFactory.id);
        expect(created.name).toBe<string>(orgFactory.savedName);
        const uri = created['_uri'];
        expect(uri.href).toBe<string>(redirectedSimple.fullUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(redirectedSimple.absoluteCreateUri);
        expect(uri.requestedUri).toBe<string>(simple.relativeCreateUri);
        expect(uri.type).toBeUndefined();
        expect(uri.resourceUri).toBe<string>(redirectedSimple.fullUri);
        orgScope.done();
        comScope.done();
      });
  });

  test('redirect to same host on halresource fetch', () => {
    const simple = orgFactory.createSimpleData();
    const redirectedSimple = orgFactory.createSimpleData('new-simple');
    const client = createClient(uriBuilder.orgBaseURI);
    const resource = createResource(client, SimpleModel, simple.relativeUri);

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(simple.relativeUri)
      .reply(307, undefined, { Location: redirectedSimple.relativeUri });
    scope
      .get(redirectedSimple.relativeUri)
      .reply(200, redirectedSimple.data);

    return resource
      .fetch().then((fetched: SimpleModel) => {
        expect(fetched.id).toBe<number>(orgFactory.id);
        expect(fetched.name).toBe<string>(orgFactory.savedName);
        const uri = fetched['_uri'];
        // TODO #1695 resource.fetch does not overwrite the existing href with the new self value
        // expect(uri.href).toBe<string>(redirectedSimple.fullUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(redirectedSimple.fullUri);
        expect(uri.requestedUri).toBe<string>(simple.relativeUri);
        expect(uri.type).toBeUndefined();
        // TODO #1695 resource.fetch does not overwrite the existing href with the new self value
        // expect(uri.resourceUri).toBe<string>(redirectedSimple.fullUri);
        scope.done();
      });
  });

  test('redirect to different host on halresource fetch', () => {
    const simple = orgFactory.createSimpleData();
    const redirectedSimple = comFactory.createSimpleData();
    const client = createClient(uriBuilder.orgBaseURI);
    const resource = createResource(client, SimpleModel, simple.relativeUri);
    resource.name = orgFactory.sendName;
    const orgScope = nock(uriBuilder.orgBaseURI);
    orgScope
      .get(simple.relativeUri)
      .reply(307, undefined, { Location: redirectedSimple.fullUri });
    const comScope = nock(uriBuilder.comBaseURI);
    comScope
      .get(redirectedSimple.relativeUri)
      .reply(200, redirectedSimple.data);

    return resource
      .fetch().then((created: SimpleModel) => {
        expect(created.id).toBe<number>(orgFactory.id);
        expect(created.name).toBe<string>(orgFactory.savedName);
        const uri = created['_uri'];
        // TODO #1695 resource.fetch does not overwrite the existing href with the new self value
        // expect(uri.href).toBe<string>(redirectedSimple.fullUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(redirectedSimple.fullUri);
        expect(uri.requestedUri).toBe<string>(simple.relativeUri);
        expect(uri.type).toBeUndefined();
        // TODO #1695 resource.fetch does not overwrite the existing href with the new self value
        // expect(uri.resourceUri).toBe<string>(redirectedSimple.fullUri);
        orgScope.done();
        comScope.done();
      });
  });

  test('redirect to same host on halresource update', () => {
    const simple = orgFactory.createSimpleData();
    const redirectedSimple = orgFactory.createSimpleData('new-simple');
    const client = createClient(uriBuilder.orgBaseURI);
    const resource = createResource(client, SimpleModel, simple.relativeUri);

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(simple.relativeUri)
      .reply(200, simple.data);
    scope
      .patch(simple.relativeUri, JSON.stringify(simple.updateNameRequest))
      .reply(307, undefined, { Location: redirectedSimple.fullUri });
    scope
      .patch(redirectedSimple.relativeUri, JSON.stringify(simple.updateNameRequest))
      .reply(200, simple.updateNameResponse);

    return resource
      .fetch()
      .then((fetched: SimpleModel) => {
        expect(fetched.id).toBe<number>(orgFactory.id);
        expect(fetched.name).toBe<string>(orgFactory.savedName);
        fetched.name = orgFactory.updatedName;
        return fetched
          .update(SimpleModel)
          .then((updated: SimpleModel) => {
            const uri = updated['_uri'];
            // TODO #1695 resource.fetch does not overwrite the existing href with the new self value
            // expect(uri.href).toBe<string>(redirectedSimple.fullUri);
            expect(uri.templated).toBe<boolean>(false)
            expect(uri.receivedUri).toBe<string>(redirectedSimple.fullUri);
            expect(uri.requestedUri).toBe<string>(simple.relativeUri);
            expect(uri.type).toBeUndefined();
            // TODO #1695 resource.fetch does not overwrite the existing href with the new self value
            // expect(uri.resourceUri).toBe<string>(redirectedSimple.fullUri);
            scope.done();
          });
      });
  });

  test('redirect to different host on halresource update', () => {
    const uriBuilder = new UriBuilder();
    const orgFactory = new SimpleFactory(uriBuilder, 'org');
    const comFactory = new SimpleFactory(uriBuilder, 'com');
    const simple = orgFactory.createSimpleData();
    const redirectedSimple = comFactory.createSimpleData();
    const client = createClient(uriBuilder.orgBaseURI);
    const resource = createResource(client, SimpleModel, simple.relativeUri);

    const orgScope = nock(uriBuilder.orgBaseURI);
    orgScope
      .get(simple.relativeUri)
      .reply(200, simple.data);
    orgScope
      .patch(simple.relativeUri, JSON.stringify(simple.updateNameRequest))
      .reply(307, undefined, { Location: redirectedSimple.fullUri });

    const comScope = nock(uriBuilder.comBaseURI)
    comScope
      .patch(simple.relativeUri, JSON.stringify(simple.updateNameRequest))
      .reply(200, simple.updateNameResponse);

    return resource
      .fetch()
      .then((model: SimpleModel) => {
        model.name = orgFactory.updatedName;
        return resource
          .update(SimpleModel)
          .then((updated: SimpleModel) => {
            expect(updated.name).toBe<string>(orgFactory.updatedName);
            const uri = updated['_uri'];
            // TODO #1695 resource.fetch does not overwrite the existing href with the new self value
            //expect(uri.href).toBe<string>(simple.fullUri);
            expect(uri.templated).toBe<boolean>(false)
            expect(uri.receivedUri).toBe<string>(redirectedSimple.fullUri);
            expect(uri.requestedUri).toBe<string>(simple.relativeUri);
            expect(uri.type).toBeUndefined();
            // TODO #1695 resource.fetch does not overwrite the existing href with the new self value
            // expect(uri.resourceUri).toBe<string>(simple.fullUri);
            orgScope.done();
            comScope.done();
          });
      });
  });
});

describe('redirect on hal-rest-client', () => {
  const uriBuilder = new UriBuilder();
  const orgFactory = new SimpleFactory(uriBuilder, 'org');
  const comFactory = new SimpleFactory(uriBuilder, 'com');

  test('redirect to same host on hal-rest-client create', () => {
    const simple = orgFactory.createSimpleData();
    const redirectedSimple = orgFactory.createSimpleData('new-simple');
    const client = createClient(uriBuilder.orgBaseURI);

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .post(simple.relativeCreateUri, JSON.stringify(simple.createRequest))
      .reply(307, undefined, { Location: redirectedSimple.absoluteCreateUri });
    scope
      .post(redirectedSimple.relativeCreateUri, JSON.stringify(simple.createRequest))
      .reply(200, redirectedSimple.data);

    return client
      .create<SimpleModel>(simple.relativeCreateUri, simple.createRequest, SimpleModel)
      .then((model: SimpleModel) => {
        const uri = model['_uri'];
        expect(uri.href).toBe<string>(redirectedSimple.fullUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(redirectedSimple.absoluteCreateUri);
        expect(uri.requestedUri).toBe<string>(simple.relativeCreateUri);
        expect(uri.type).toBeUndefined();
        expect(uri.resourceUri).toBe<string>(redirectedSimple.fullUri);
        scope.done();
      })
  });

  test('redirect to different host on hal-rest-client create', () => {
    const simple = orgFactory.createSimpleData();
    const redirectedSimple = comFactory.createSimpleData();
    const client = createClient(uriBuilder.orgBaseURI);
    const orgScope = nock(uriBuilder.orgBaseURI);
    orgScope
      .post(simple.relativeCreateUri, JSON.stringify(simple.createRequest))
      .reply(307, undefined, { Location: redirectedSimple.absoluteCreateUri });
    const comScope = nock(uriBuilder.comBaseURI);
    comScope
      .post(redirectedSimple.relativeCreateUri, JSON.stringify(simple.createRequest))
      .reply(200, redirectedSimple.data);

    return client
      .create<SimpleModel>(simple.relativeCreateUri, simple.createRequest, SimpleModel)
      .then((model: SimpleModel) => {
        const uri = model['_uri'];
        expect(uri.href).toBe<string>(redirectedSimple.fullUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(redirectedSimple.absoluteCreateUri);
        expect(uri.requestedUri).toBe<string>(redirectedSimple.relativeCreateUri);
        expect(uri.type).toBeUndefined();
        expect(uri.resourceUri).toBe<string>(redirectedSimple.fullUri);
        orgScope.done();
        comScope.done();
      })
  });

  test('redirect to same host on hal-rest-client update', () => {
    const simple = orgFactory.createSimpleData();
    const redirectedSimple = orgFactory.createSimpleData('new-simple');
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .patch(simple.relativeUri, JSON.stringify(simple.updateNameRequest))
      .reply(307, undefined, { Location: redirectedSimple.fullUri });
    scope
      .patch(redirectedSimple.relativeUri, JSON.stringify(simple.updateNameRequest))
      .reply(200, redirectedSimple.data);

    return client
      .update<SimpleModel>(simple.relativeUri, simple.updateNameRequest, false, SimpleModel)
      .then((model: SimpleModel) => {
        const uri = model['_uri'];
        expect(uri.href).toBe<string>(redirectedSimple.fullUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(redirectedSimple.fullUri);
        expect(uri.requestedUri).toBe<string>(simple.relativeUri);
        expect(uri.type).toBeUndefined();
        expect(uri.resourceUri).toBe<string>(redirectedSimple.fullUri);
        scope.done();
      });
  });

  test('redirect to different host on hal-rest-client update', () => {
    const simple = orgFactory.createSimpleData();
    const redirectedSimple = comFactory.createSimpleData();
    const client = createClient(uriBuilder.orgBaseURI);
    const resource = createResource(client, SimpleModel, simple.relativeCreateUri);
    resource.name = orgFactory.sendName;
    const orgScope = nock(uriBuilder.orgBaseURI);
    orgScope
      .patch(simple.relativeUri, JSON.stringify(simple.updateNameRequest))
      .reply(307, undefined, { Location: redirectedSimple.fullUri });
    const comScope = nock(uriBuilder.comBaseURI);
    comScope
      .patch(redirectedSimple.relativeUri, JSON.stringify(simple.updateNameRequest))
      .reply(200, redirectedSimple.data);

    return client
      .update<SimpleModel>(simple.relativeUri, simple.updateNameRequest, false, SimpleModel)
      .then((model: SimpleModel) => {
        const uri = model['_uri'];
        expect(uri.href).toBe<string>(redirectedSimple.fullUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(redirectedSimple.fullUri);
        expect(uri.requestedUri).toBe<string>(simple.relativeUri);
        expect(uri.type).toBeUndefined();
        expect(uri.resourceUri).toBe<string>(redirectedSimple.fullUri);
        orgScope.done();
        comScope.done();
      });
  });

  test('redirect to same host on hal-rest-client fetch', () => {
    const simple = orgFactory.createSimpleData();
    const redirectedSimple = orgFactory.createSimpleData('new-simple');
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(simple.relativeUri)
      .reply(307, undefined, { Location: redirectedSimple.fullUri });
    scope
      .get(redirectedSimple.relativeUri)
      .reply(200, redirectedSimple.data);

    return client
      .fetch(simple.relativeUri, SimpleModel)
      .then((fetched: SimpleModel) => {
        expect(fetched.id).toBe<number>(orgFactory.id);
        expect(fetched.name).toBe<string>(orgFactory.savedName);
        const uri = fetched['_uri'];
        expect(uri.href).toBe<string>(redirectedSimple.fullUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(redirectedSimple.fullUri);
        expect(uri.requestedUri).toBe<string>(simple.relativeUri);
        expect(uri.type).toBeUndefined();
        expect(uri.resourceUri).toBe<string>(redirectedSimple.fullUri);
        scope.done();
      });
  });

  test('redirect to different host on hal-rest-client fetch', () => {
    const simple = orgFactory.createSimpleData();
    const redirectedSimple = comFactory.createSimpleData();
    const client = createClient(uriBuilder.orgBaseURI);
    const resource = createResource(client, SimpleModel, simple.relativeCreateUri);
    resource.name = orgFactory.sendName;
    const orgScope = nock(uriBuilder.orgBaseURI);
    orgScope
      .get(simple.relativeUri)
      .reply(307, undefined, { Location: redirectedSimple.fullUri });
    const comScope = nock(uriBuilder.comBaseURI);
    comScope
      .get(redirectedSimple.relativeUri)
      .reply(200, redirectedSimple.data);
    return client
      .fetch(simple.relativeUri, SimpleModel)
      .then((fetched: SimpleModel) => {
        expect(fetched.id).toBe<number>(orgFactory.id);
        expect(fetched.name).toBe<string>(orgFactory.savedName);
        const uri = fetched['_uri'];
        expect(uri.href).toBe<string>(redirectedSimple.fullUri);
        expect(uri.templated).toBe<boolean>(false)
        expect(uri.receivedUri).toBe<string>(redirectedSimple.fullUri);
        expect(uri.requestedUri).toBe<string>(simple.relativeUri);
        expect(uri.type).toBeUndefined();
        expect(uri.resourceUri).toBe<string>(redirectedSimple.fullUri);
        orgScope.done();
        comScope.done();
      });
  });


});