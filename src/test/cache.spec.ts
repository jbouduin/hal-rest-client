import * as nock from 'nock';
import { createClient, HalResource, cache } from '..';
import { IFactoryResult, IData, HostTld, ILink } from './data/common-definitions';
import { DataFactory } from './data/data-factory';
import { UriBuilder } from './data/uri-builder';
import { Person } from './models';

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

describe('Basic cache functionality', () => {
  const uriBuilder = new UriBuilder();
  const dummyFactory = new DataFactory(uriBuilder);

  test('Fetched resource is cached with its full URI test 1', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const dummy = dummyFactory.createResourceData('org', 'dummy', 1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(dummy.relativeUri)
      .reply(200, dummy.data);
    return client
      .fetch(dummy.relativeUri, HalResource)
      .then(() => {
        expect(cache.getKeys('Resource')).toContain<string>(dummy.fullUri);
        scope.done();
      });
  });

  // TODO this one fails
  test.skip('Fetched resource is cached with its full URI even if self is returned relative', () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const dummy = dummyFactory.createResourceData('org', 'dummy', 1);
    (dummy.data._links.self as ILink).href = dummy.relativeUri;
    console.log(JSON.stringify(dummy.data, null, 2));
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(dummy.relativeUri)
      .reply(200, dummy.data);
    return client
      .fetch(dummy.relativeUri, HalResource)
      .then(() => {
        expect(cache.getKeys('Resource')).toContain<string>(dummy.fullUri);
        scope.done();
      })
  });

  test('Client created with URI is cached', () => {
    createClient(uriBuilder.orgBaseURI);
    expect(cache.getKeys('Client')).toHaveLength(1);
    expect(cache.getKeys('Client')).toContain(uriBuilder.orgBaseURI);
  });

  test('Client created without URI is not cached', () => {
    createClient();
    expect(cache.getKeys('Client')).toHaveLength(0);
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
    const dummy = dummies[0].fullUri;
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
    const dummy0 = dummies[0].fullUri;
    const dummy1 = dummies[1].fullUri;
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
    const dummy = dummies[0].fullUri;
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

describe('refreshing mechanism', () => {
  const uriBuilder = new UriBuilder();
  const dummyFactory = new DataFactory(uriBuilder);
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
      .fetchArray(dummy1.fullUri, HalResource)
      .then((dummies: Array<HalResource>) => {
        expect(dummies[0].prop('done').count).toBe<number>(1);
        return createClient()
          .fetchArray(dummy1.fullUri, HalResource)
          .then((dummies2: Array<HalResource>) => {
            expect(dummies2[0].prop('done')).toBeUndefined();
            expect(dummies2[0].prop('testing').count).toBe<number>(1);
            scope.done();
          });
      });
  });
});

describe.skip('Still to do tests', () => {
  beforeAll(() => {
    const person1 = {
      _embedded: {
        'best-friend': {
          _links: {
            self: {
              href: 'http://test.fr/person/2',
            },
          },
          name: 'My bestfriend',
        },
        'father': {
          _links: {
            self: {
              href: 'http://test.fr/person/12',
            },
          },
          name: 'My father',
        },
        'mother': {
          _links: {
            self: {
              href: 'http://test.fr/person/12',
            },
          },
          name: 'My mother',
        },
        'my-friends': [
          {
            _links: { self: { href: 'http://test.fr/person/5' } },
            name: 'Thomas',
          },
        ],
      },
      _links: {
        contacts: {
          href: 'http://test.fr/person/2/contacts',
        },
        'home': {
          href: 'http://test.fr/person/1/location/home',
        },
        'place-of-employment': {
          href: 'http://test.fr/person/1/location/work',
        },
        self: {
          href: 'http://test.fr/person/1',
        },
      },
      name: 'Project 1',
    };

    const scope2 = nock('http://test.fr/').persist();
    scope2.get('/person/1')
      .reply(200, person1);

  });

  const uriBuilder = new UriBuilder();
  // TODO understand or redefine the caching mechanism before trying to solve the next two
  test('refresh from cache reload from cached object', () => {
    const client = createClient(uriBuilder.baseUri('org'));
    return client
      .fetch('/person/1', Person)
      .then((person: Person) => {
        expect(person.name).toBe<string>('Project 1');
        person.name = 'test';
        expect(person.name).toBe<string>('test');
        return client
          .fetch('/person/1', Person)
          .then((fetched: Person) => {
            expect(fetched.name).toBe<string>('Project 1');
          });
      });
  });

  test('refresh from cache does not reload from cached object after resetCache', () => {

    const client = createClient(uriBuilder.baseUri('org'));
    return client
      .fetch('/person/1', Person)
      .then((person: Person) => {
        expect(person.name).toBe<string>('Project 1');
        person.name = 'test';
        expect(person.name).toBe<string>('test');
        cache.reset();
        return client
          .fetch('/person/1', Person)
          .then((fetched: Person) => {
            expect(fetched.name).toBe<string>('Project 1');
          });
      });
  });

  test('chached resource is reused', () => {
    const getResourceSpy = jest.spyOn(cache, 'getResource')
    const setResourceSpy = jest.spyOn(cache, 'setResource')
    const client = createClient(uriBuilder.baseUri('org'));
    return client
      .fetch('/dummy', HalResource)
      .then(() => {
        return client
          .fetch('/dummy', HalResource)
          .then(() => {

            expect(cache.getKeys('Resource')).toHaveLength(1);

            expect(getResourceSpy).toHaveBeenCalledTimes(1);
            expect(setResourceSpy).toHaveBeenCalledTimes(1);
            getResourceSpy.mockReset();
            getResourceSpy.mockRestore();
            setResourceSpy.mockReset();
            setResourceSpy.mockRestore();
          });
      });
  });


});