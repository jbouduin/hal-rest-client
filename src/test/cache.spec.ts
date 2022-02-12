import * as nock from 'nock';
import { HalRestClient } from '../lib/hal-rest-client';
import { createClient, cache, createResource, IHalResource, HalResource } from '..';
import { IFactoryResult, IData, HostTld } from './data/common-definitions';
import { DataFactory, SelfOption } from './data/data-factory';
import { UriBuilder } from './data/uri-builder';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  cache.reset();
});

afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
  nock.cleanAll();

});
//#endregion

type FetchType = 'absolute' | 'relative';
describe.each([
  // if no self-link => No caching
  [true, 'org', 'relative', SelfOption.NoSelf, 0],
  [true, 'org', 'relative', SelfOption.NullLink, 0],
  [true, 'org', 'relative', SelfOption.NullString, 0],
  [true, 'org', 'absolute', SelfOption.NoSelf, 0],
  [true, 'org', 'absolute', SelfOption.NullLink, 0],
  [true, 'org', 'absolute', SelfOption.NullString, 0],
  [false, 'org', 'absolute', SelfOption.NoSelf, 0],
  [false, 'org', 'absolute', SelfOption.NullLink, 0],
  [false, 'org', 'absolute', SelfOption.NullString, 0],
  // if self-link is templated => no caching => covered in another links.spec.ts
  // self-link is absolute => cache using self-link as key
  [false, 'org', 'absolute', SelfOption.AbsoluteLink, 2],
  [false, 'org', 'absolute', SelfOption.AbsoluteString, 2],
  [true, 'org', 'relative', SelfOption.AbsoluteLink, 2],
  [true, 'org', 'relative', SelfOption.AbsoluteString, 2],
  [true, 'org', 'absolute', SelfOption.AbsoluteLink, 2],
  [true, 'org', 'absolute', SelfOption.AbsoluteString, 2],
  [true, 'com', 'absolute', SelfOption.AbsoluteLink, 2],
  [true, 'com', 'absolute', SelfOption.AbsoluteString, 2],
  // rest client has a base URI and self-link resource was fetched with an absolute URL on a different server => no caching
  [true, 'com', 'absolute', SelfOption.RelativeLink, 0],
  [true, 'com', 'absolute', SelfOption.RelativeString, 0],
  // rest client has a base URI and self-link is relative => cache using combined base URI and self-link
  [true, 'org', 'relative', SelfOption.RelativeLink, 2],
  [true, 'org', 'relative', SelfOption.RelativeString, 2],
  [true, 'org', 'absolute', SelfOption.RelativeLink, 2],
  [true, 'org', 'absolute', SelfOption.RelativeString, 2],
  // rest client has no base URI and self-link is relative => no caching
  [false, 'org', 'absolute', SelfOption.RelativeLink, 0],
  [false, 'org', 'absolute', SelfOption.RelativeString, 0],
  [false, 'com', 'absolute', SelfOption.RelativeLink, 0],
  [false, 'com', 'absolute', SelfOption.RelativeString, 0]
])('Caching resources', (clientWithBaseURI: boolean, dummyTld: HostTld, fetch: FetchType, selfOption: SelfOption, cachedEntries: number) => {
  const uriBuilder = new UriBuilder();
  const dummyFactory = new DataFactory(uriBuilder);
  const client = createClient(clientWithBaseURI ? uriBuilder.baseUri('org') : undefined);

  test(`Fetch resource from ${dummyTld} using ${fetch} uri, client created ${clientWithBaseURI ? 'with baseURL' : 'wihtout baseURL'} - self is ${selfOption}`, () => {
    const embedded = dummyFactory.createResourceData(dummyTld, 'embedded', 1, undefined, undefined, selfOption);
    const dummy = dummyFactory.createResourceData(dummyTld, 'dummy', 1, { child: embedded.data }, undefined, selfOption);

    const scope = nock(uriBuilder.baseUri(dummyTld));
    scope
      .get(dummy.relativeUri)
      .reply(200, dummy.data);

    return client
      .fetch(fetch === 'absolute' ? dummy.absoluteUri : dummy.relativeUri, HalResource)
      .then(() => {
        const cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(cachedEntries);
        if (cachedEntries > 0) {
          expect(cacheKeys).toContainEqual<string>(dummy.absoluteUri);
          expect(cacheKeys).toContainEqual<string>(embedded.absoluteUri);
        }
        scope.done();
      });
  });
});

describe('creating a resource once with full and one with relative uri', () => {
  const uriBuilder = new UriBuilder();
  const client = createClient(uriBuilder.orgBaseURI);
  const full = uriBuilder.resourceUri('org', false, 'test', 69);
  const relative = uriBuilder.resourceUri('org', true, 'test', 69);
  test('full uri first', () => {
    createResource(client, HalResource, full);
    expect(cache.getKeys('Resource')).toHaveLength(1);
    createResource(client, HalResource, relative);
    expect(cache.getKeys('Resource')).toHaveLength(1);
  });

  test('relative uri first', () => {
    createResource(client, HalResource, relative);
    expect(cache.getKeys('Resource')).toHaveLength(1);
    createResource(client, HalResource, full);
    expect(cache.getKeys('Resource')).toHaveLength(1);
  });
});

describe('Caching clients', () => {
  const uriBuilder = new UriBuilder();
  test('Client created with URI is cached', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const keys = cache.getKeys('Client');
    expect(client).toBeInstanceOf(HalRestClient);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toBe<string>(uriBuilder.orgBaseURI);
  });

  test('Client created without URI is not cached', () => {
    const client = createClient();
    expect(client).toBeInstanceOf(HalRestClient);
    expect(cache.getKeys('Client')).toHaveLength(0);
  });

  test('Client is created and cached without trailing slash', () => {
    const client = createClient(uriBuilder.orgBaseURI + '/');
    const keys = cache.getKeys('Client');
    expect(keys).toHaveLength(1);
    expect(keys[0]).toBe<string>(uriBuilder.orgBaseURI);
    expect(client.config.baseURL).toBe<string>(uriBuilder.orgBaseURI);
  });

  test('Client is created and cached without trailing slashes', () => {
    const client = createClient(uriBuilder.orgBaseURI + '///');
    const keys = cache.getKeys('Client');
    expect(keys).toHaveLength(1);
    expect(keys[0]).toBe<string>(uriBuilder.orgBaseURI);
    expect(client.config.baseURL).toBe<string>(uriBuilder.orgBaseURI);
  });
});

describe('Reset cache', () => {
  const uriBuilder = new UriBuilder();
  const dummyFactory = new DataFactory(uriBuilder);
  const dummy = dummyFactory.createResourceData('org', 'dummy', 1);
  let scope: nock.Scope;
  beforeEach(() => {
    scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(dummy.relativeUri)
      .reply(200, dummy.data);
  });

  test('Reset cache without parameter empties both caches', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(dummy.relativeUri, HalResource)
      .then(() => {
        cache.reset();
        expect(cache.getKeys('Client')).toHaveLength(0);
        expect(cache.getKeys('Resource')).toHaveLength(0);
        scope.done();
      })
  });

  test('Reset cache with parameter \'Client\' empties only client cache', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(dummy.relativeUri, HalResource)
      .then(() => {
        cache.reset('Client');
        expect(cache.getKeys('Client')).toHaveLength(0);
        expect(cache.getKeys('Resource')).toHaveLength(1);
        scope.done();
      })
  });

  test('Reset cache with parameter \'Resource\' empties only client cache', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(dummy.relativeUri, HalResource)
      .then(() => {
        cache.reset('Resource');
        expect(cache.getKeys('Client')).toHaveLength(1);
        expect(cache.getKeys('Resource')).toHaveLength(0);
        scope.done();
      })
  });

  test('cached client is reused', () => {
    const getClientSpy = jest.spyOn(cache, 'getClient');
    const setClientSpy = jest.spyOn(cache, 'setClient');
    createClient(uriBuilder.orgBaseURI);
    createClient(uriBuilder.orgBaseURI);
    expect(cache.getKeys('Client')).toHaveLength(1);
    expect(getClientSpy).toHaveBeenCalledTimes(1);
    expect(setClientSpy).toHaveBeenCalledTimes(1);
    getClientSpy.mockReset();
    getClientSpy.mockRestore();
    setClientSpy.mockReset();
    setClientSpy.mockRestore();
  })

});

describe('clear client cache tests', () => {
  const uriBuilder = new UriBuilder();
  const orgUri = uriBuilder.orgBaseURI;
  const comUri = uriBuilder.comBaseURI;

  beforeEach(() => {
    for (let i = 1; i <= 5; i++) {
      createClient(`${orgUri}/instance${i}`);
    }
    for (let i = 1; i <= 5; i++) {
      createClient(`${comUri}/instance${i}`);
    }
  });

  test('clear client cache using a string parameter', () => {
    const cleared = cache.clear('Client', `${orgUri}/instance1`);
    expect(cleared).toHaveLength(1);
    expect(cleared[0]).toBe<string>(`${orgUri}/instance1`);
    const remaining = cache.getKeys('Client');
    expect(remaining).toHaveLength(9);
    expect(remaining).not.toContain<string>(`${orgUri}/instance1`);
  });

  test('clear client cache using an array of strings parameter', () => {
    const instance1 = `${orgUri}/instance1`;
    const instance2 = `${orgUri}/instance2`;
    const cleared = cache.clear('Client', [instance1, instance2]);
    expect(cleared).toHaveLength(2);
    expect(cleared).toContain<string>(instance1);
    expect(cleared).toContain<string>(instance2);
    const remaining = cache.getKeys('Client');
    expect(remaining).toHaveLength(8);
    expect(remaining).not.toContain<string>(instance1);
    expect(remaining).not.toContain<string>(instance2);
  });

  test('clear client cache using an array of strings parameter with double entry', () => {
    const instance1 = `${orgUri}/instance1`;
    const cleared = cache.clear('Client', [instance1, instance1]);
    expect(cleared).toHaveLength(1);
    expect(cleared[0]).toBe<string>(instance1);
    const remaining = cache.getKeys('Client');
    expect(remaining).toHaveLength(9);
    expect(remaining).not.toContain<string>(instance1);

  });

  test('clear client cache using a regular expression', () => {
    const instance1 = `${orgUri}/instance1`;
    const instance2 = `${orgUri}/instance2`;
    const instance3 = `${orgUri}/instance3`;
    const instance4 = `${orgUri}/instance4`;
    const instance5 = `${orgUri}/instance5`;
    const cleared = cache.clear('Client', new RegExp('http://[a-zA-z0-9-.]*.org/[a-zA-z0-9]*'));
    expect(cleared).toHaveLength(5);
    expect(cleared).toContain<string>(instance1);
    expect(cleared).toContain<string>(instance2);
    expect(cleared).toContain<string>(instance3);
    expect(cleared).toContain<string>(instance4);
    expect(cleared).toContain<string>(instance5);
    const remaining = cache.getKeys('Client');
    expect(remaining).toHaveLength(5);
    expect(remaining).not.toContain<string>(instance1);
    expect(remaining).not.toContain<string>(instance2);
    expect(remaining).not.toContain<string>(instance3);
    expect(remaining).not.toContain<string>(instance4);
    expect(remaining).not.toContain<string>(instance5);
  });
});

describe('resource.removeFromCache method' , () => {
  const uriBuilder = new UriBuilder();
  const client = createClient(uriBuilder.orgBaseURI);
  test('call remove from cache on a cached entry', () => {
    const full = uriBuilder.resourceUri('org', false, 'test', 69);
    const resource = createResource(client, HalResource, full);
    expect(cache.getKeys('Resource')).toHaveLength(1);
    const result = resource.removeFromCache();
    expect(result).toBe<boolean>(true);
    expect(cache.getKeys('Resource')).toHaveLength(0);
  });

  test('call remove from cache on non a cached entry', () => {
    const full = uriBuilder.resourceUri('org', false, 'test', 69);
    const resource = createResource(client, HalResource, full, true);
    expect(cache.getKeys('Resource')).toHaveLength(0);
    const result = resource.removeFromCache();
    expect(result).toBe<boolean>(false);
    expect(cache.getKeys('Resource')).toHaveLength(0);
  });
});

describe('clear resource cache tests', () => {
  const uriBuilder = new UriBuilder();
  const dummyFactory = new DataFactory(uriBuilder);
  const dummyPath = 'dummy';
  let dummies: Array<IFactoryResult<IData>>;
  let scope: nock.Scope;
  beforeEach(() => {
    const promises = new Array<Promise<HalResource>>();
    dummies = new Array<IFactoryResult<IData>>();
    uriBuilder.allTld
      .forEach((tld: HostTld) => {
        const baseUri = uriBuilder.baseUri(tld);
        const client = createClient(baseUri)
        scope = nock(baseUri);
        for (let i = 1; i <= 5; i++) {
          const dummy = dummyFactory.createResourceData(tld, dummyPath, i);
          dummies.push(dummy);
          scope
            .get(dummy.relativeUri)
            .reply(200, dummy.data);
          promises.push(client.fetch(dummy.relativeUri, HalResource));
        }
      });
    return Promise.all(promises);
  });

  test('clear resource cache using a string parameter', () => {
    expect(cache.getKeys('Resource')).toHaveLength(10);
    const dummy = dummies[0].absoluteUri;
    const cleared = cache.clear('Resource', dummy);
    expect(cleared).toHaveLength(1);
    expect(cleared[0]).toBe<string>(dummy);
    const remaining = cache.getKeys('Resource');
    expect(remaining).toHaveLength(9);
    expect(remaining).not.toContain<string>(dummy);
    scope.done();
  });

  test('clear resource cache using an array of strings parameter', () => {
    expect(cache.getKeys('Resource')).toHaveLength(10);
    const dummy0 = dummies[0].absoluteUri;
    const dummy1 = dummies[1].absoluteUri;
    const cleared = cache.clear('Resource', [dummy1, dummy0]);
    expect(cleared).toHaveLength(2);
    expect(cleared).toContain<string>(dummy0);
    expect(cleared).toContain<string>(dummy1);
    const remaining = cache.getKeys('Resource');
    expect(remaining).toHaveLength(8);
    expect(remaining).not.toContain<string>(dummy0);
    expect(remaining).not.toContain<string>(dummy1);
    scope.done();
  });

  test('clear resource cache using an array of strings parameter with double entry', () => {
    expect(cache.getKeys('Resource')).toHaveLength(10);
    const dummy = dummies[0].absoluteUri;
    const cleared = cache.clear('Resource', [dummy, dummy]);
    expect(cleared).toHaveLength(1);
    expect(cleared[0]).toBe<string>(dummy);
    const remaining = cache.getKeys('Resource');
    expect(remaining).toHaveLength(9);
    expect(remaining).not.toContain<string>(dummy);
    scope.done();
  });

  test('clear resource cache using a regular expression', () => {
    expect(cache.getKeys('Resource')).toHaveLength(10);
    const cleared = cache.clear('Resource', new RegExp('http://[a-zA-z0-9-.]*.org/dummy/[a-zA-z0-9]*'));
    expect(cleared).toHaveLength(5);
    const expectedToBeRemoved = new Array<string>();
    for (let i = 1; i <= 5; i++) {
      expectedToBeRemoved.push(uriBuilder.resourceUri('org', false, 'dummy', i));
    }
    expect(cleared).toContain<string>(expectedToBeRemoved[0]);
    expect(cleared).toContain<string>(expectedToBeRemoved[1]);
    expect(cleared).toContain<string>(expectedToBeRemoved[2]);
    expect(cleared).toContain<string>(expectedToBeRemoved[3]);
    expect(cleared).toContain<string>(expectedToBeRemoved[4]);
    const remaining = cache.getKeys('Resource');
    expect(remaining).toHaveLength(5);
    expect(remaining).not.toContain<string>(expectedToBeRemoved[0]);
    expect(remaining).not.toContain<string>(expectedToBeRemoved[1]);
    expect(remaining).not.toContain<string>(expectedToBeRemoved[2]);
    expect(remaining).not.toContain<string>(expectedToBeRemoved[3]);
    expect(remaining).not.toContain<string>(expectedToBeRemoved[4]);
    scope.done();
  });
});

describe('using cache', () => {
  const uriBuilder = new UriBuilder();
  const dummyFactory = new DataFactory(uriBuilder);

  // TODO 1660 Remove non compliant feature of retrieving an array of HAL-resources
  test('Lists are refreshed when calling fetchArray', () => {

    const dummy1 = dummyFactory.createResourceData('org', 'dummy', 1, { done: { count: 1 } });
    const dummy2 = dummyFactory.createResourceData('org', 'dummy', 1, { testing: { count: 1 } });

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(dummy1.relativeUri)
      .reply(200, [dummy1.data]);
    scope
      .get(dummy1.relativeUri)
      .reply(200, [dummy2.data]);

    return createClient()
      .fetchArray(dummy1.absoluteUri, HalResource)
      .then((dummies: Array<HalResource>) => {
        expect((dummies[0].getProperty<IHalResource>('done')).getProperty('count')).toBe<number>(1);
        return createClient()
          .fetchArray(dummy1.absoluteUri, HalResource)
          .then((dummies2: Array<HalResource>) => {
            expect(dummies2[0].getProperty('done')).toBeUndefined();
            expect((dummies2[0].getProperty<IHalResource>('testing')).getProperty('count')).toBe<number>(1);
            scope.done();
          });
      });
  });

  test('client with a baseUrl is re-used', () => {
    const getClientSpy = jest.spyOn(cache, 'getClient')
    const setClientSpy = jest.spyOn(cache, 'setClient')
    const client = createClient(uriBuilder.orgBaseURI);
    const client2 = createClient(uriBuilder.orgBaseURI);

    expect(cache.getKeys('Client')).toHaveLength(1);
    expect(getClientSpy).toHaveBeenCalledTimes(1);
    expect(setClientSpy).toHaveBeenCalledTimes(1);
    expect(client).toBe(client2);
    getClientSpy.mockReset();
    getClientSpy.mockRestore();
    setClientSpy.mockReset();
    setClientSpy.mockRestore();
  });

});

describe.each([
  [undefined, undefined, false],
  [undefined, false, false],
  [undefined, true, false],
  ['test', undefined, true],
  ['test', false, true],
  ['test', true, false]
])('caching of resources created using the factory', (uri: string, templated: boolean, isCached: boolean) => {
  const uriBuilder = new UriBuilder();
  const logAs = templated ? 'true' : templated === false ? 'false' : 'undefined'
  test(`resource created ${uri ? 'with' : 'without'} uri, templated = ${logAs}`, () => {
    createResource(createClient(uriBuilder.orgBaseURI), HalResource, uri, templated);
    expect(cache.getKeys('Resource')).toHaveLength(isCached ? 1 : 0);
  });
});


describe('things not to be cached', () => {
  const uriBuilder = new UriBuilder();
  test('null href in _links', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    const dummyUri = uriBuilder.resourceUri('org', true, 'dummy');
    const noNullUri = uriBuilder.resourceUri('org', false, 'no-null');
    const dummyReply = {
      _links: {
        withNull: { href: null },
        noNull: { href: noNullUri }
      }
    };

    scope
      .get(dummyUri)
      .reply(200, dummyReply);

    return client
      .fetch(dummyUri, HalResource)
      .then((result: HalResource) => {
        expect(result.getLink('withNull')).toBeInstanceOf(HalResource);
        expect(result.getLink('noNull')).toBeInstanceOf(HalResource);
        const cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(noNullUri);
      })
  });

  test('empty href in _links', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    const dummyUri = uriBuilder.resourceUri('org', true, 'dummy');
    const noNullUri = uriBuilder.resourceUri('org', false, 'no-null');
    const dummyReply = {
      _links: {
        withNull: { href: '' },
        noNull: { href: noNullUri }
      }
    };

    scope
      .get(dummyUri)
      .reply(200, dummyReply);

    return client
      .fetch(dummyUri, HalResource)
      .then((result: HalResource) => {
        expect(result.getLink('withNull')).toBeInstanceOf(HalResource);
        expect(result.getLink('noNull')).toBeInstanceOf(HalResource);
        const cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(noNullUri);
      })
  });

  test('null string in _links', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    const dummyUri = uriBuilder.resourceUri('org', true, 'dummy');
    const noNullUri = uriBuilder.resourceUri('org', false, 'no-null');
    const dummyReply = {
      _links: {
        withNull: null,
        noNull: noNullUri
      }
    };

    scope
      .get(dummyUri)
      .reply(200, dummyReply);

    return client
      .fetch(dummyUri, HalResource)
      .then((result: HalResource) => {
        expect(result.getLink('withNull')).toBeInstanceOf(HalResource);
        expect(result.getLink('noNull')).toBeInstanceOf(HalResource);
        const cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(noNullUri);
      })
  });

  test('empty string in _links', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    const dummyUri = uriBuilder.resourceUri('org', true, 'dummy');
    const noNullUri = uriBuilder.resourceUri('org', false, 'no-null');
    const dummyReply = {
      _links: {
        withNull: '',
        noNull: noNullUri
      }
    };

    scope
      .get(dummyUri)
      .reply(200, dummyReply);

    return client
      .fetch(dummyUri, HalResource)
      .then((result: HalResource) => {
        expect(result.getLink('withNull')).toBeInstanceOf(HalResource);
        expect(result.getLink('noNull')).toBeInstanceOf(HalResource);
        const cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(noNullUri);
      })
  });

  test('links which have a type which is not hal-json', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    const dummyUri = uriBuilder.resourceUri('org', true, 'dummy');
    const htmlUri = uriBuilder.resourceUri('org', false, 'html');
    const typedResourceUri = uriBuilder.resourceUri('org', false, 'typedResource');
    const nonTypedResourceUri = uriBuilder.resourceUri('org', false, 'nontypedResource');
    const dummyReply = {
      _links: {
        htmlLink: {
          href: htmlUri,
          type: 'text/html'
        },
        typed: {
          href: typedResourceUri,
          type: 'application/hal+json'
        },
        nontyped: {
          href: nonTypedResourceUri
        }
      }
    };

    scope
      .get(dummyUri)
      .reply(200, dummyReply);

    return client
      .fetch(dummyUri, HalResource)
      .then((result: HalResource) => {
        expect(result.getLink('typed')).toBeInstanceOf(HalResource);
        expect(result.getLink('nontyped')).toBeInstanceOf(HalResource);
        expect(result.getLink('htmlLink')).toBeInstanceOf(HalResource);
        const cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(2);
        expect(cacheKeys).toContainEqual(nonTypedResourceUri);
        expect(cacheKeys).toContainEqual(typedResourceUri);
      })
  })
});

describe.each([
  [true, true],
  [true, false],
  [false, false]
])('createResource uses cache', (clientWithBaseUri: boolean, fetchWithRelativeUri: boolean) => {
  const uriBuilder = new UriBuilder();
  const dummyFactory = new DataFactory(uriBuilder);

  test(`Client created ${clientWithBaseUri ? 'with' : 'without'} baseUri, fetching with ${fetchWithRelativeUri ? 'relative' : 'absolute'} uri`, () => {
    const client = createClient(clientWithBaseUri ? uriBuilder.orgBaseURI : undefined);
    const dummy = dummyFactory.createResourceData('org', 'dummy', 1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(dummy.relativeUri)
      .once()
      .reply(200, dummy.data);

    return client
      .fetch(fetchWithRelativeUri ? dummy.relativeUri : dummy.absoluteUri, HalResource)
      .then((fetched: HalResource) => {
        expect(fetched.isLoaded).toBe<boolean>(true);
        const created = createResource(client, HalResource, clientWithBaseUri ? dummy.relativeUri : dummy.absoluteUri);
        expect(created.isLoaded).toBe<boolean>(true);
        expect(created).toBe(fetched);
      });
  });
});