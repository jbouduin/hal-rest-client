import * as nock from 'nock';
// import { Person } from './models';
import { createClient, HalResource, cache } from '..';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  cache.reset();

  const projectsList1 = [{
    _embedded: {
      Done: {
        count: 1,
      },
    },
    _links: {
      self: {
        href: 'http://test.fr/projects/1',
      },
    },
  }];

  const projectsList2 = [{
    _embedded: {
      Testing: {
        count: 1,
      },
    },
    _links: {
      self: {
        href: 'http://test.fr/projects/1',
      },
    },
  }];

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

  const dummy = {
    _embedded: {
      data: 'data'
    },
    _links: {
      self: {
        href: 'http://test.fr/dummy',
      },
    },
  }
  const scope = nock('http://test.fr/');

  scope
    .get('/projects')
    .reply(200, projectsList1);

  scope
    .get('/projects')
    .reply(200, projectsList2);

  const scope2 = nock('http://test.fr/').persist();
  scope2.get('/person/1')
    .reply(200, person1);
  scope2
    .get('/dummy')
    .reply(200, dummy);
});

afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('Cache', () => {
  test('Lists are refreshed when calling fetchArray', () => {
    return createClient()
      .fetchArray('http://test.fr/projects', HalResource)
      .then((projects: Array<HalResource>) => {
        expect(projects[0].prop('Done').count).toBe<number>(1);
        return createClient()
          .fetchArray('http://test.fr/projects', HalResource)
          .then((projects2: Array<HalResource>) => {
            expect(projects2[0].prop('Done')).toBeUndefined();
            expect(projects2[0].prop('Testing').count).toBe<number>(1);
          });
      });
  });

  test('Fetched resource is cached', () => {
    const client = createClient('http://test.fr/');
    return client
      .fetch('dummy', HalResource)
      .then(() => {
        expect(cache.getKeys('Resource')).toContain<string>('http://test.fr/dummy');
      })
  });

  test('Client created with URI is cached', () => {
    createClient('http://test.fr/');
    expect(cache.getKeys('Client')).toContain('http://test.fr/');
    expect(cache.getKeys('Client')).toHaveLength(1);
  });

  test('Client created without URI is cached', () => {
    createClient();
    expect(cache.getKeys('Client')).toHaveLength(0);
  });

  test('Reset cache without parameter empties both caches', () => {
    const client = createClient('http://test.fr/');
    return client
      .fetch('/dummy', HalResource)
      .then(() => {
        cache.reset();
        expect(cache.getKeys('Client')).toHaveLength(0);
        expect(cache.getKeys('Resource')).toHaveLength(0);
      })
  });

  test('Reset cache with parameter \'Client\' empties only client cache', () => {
    const client = createClient('http://test.fr/');
    return client
      .fetch('/dummy', HalResource)
      .then(() => {
        cache.reset('Client');
        expect(cache.getKeys('Client')).toHaveLength(0);
        expect(cache.getKeys('Resource')).toHaveLength(1);
      })
  });

  test('Reset cache with parameter \'Resource\' empties only client cache', () => {
    const client = createClient('http://test.fr/');
    return client
      .fetch('/dummy', HalResource)
      .then(() => {
        cache.reset('Resource');
        expect(cache.getKeys('Client')).toHaveLength(1);
        expect(cache.getKeys('Resource')).toHaveLength(0);
      })
  });

  test('cached client is reused', () => {
    const getClientSpy = jest.spyOn(cache, 'getClient')
    const setClientSpy = jest.spyOn(cache, 'setClient')
    createClient('http://test.fr/');
    createClient('http://test.fr/');
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
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) {
      createClient(`http://test${i}.fr`);
    }
    for (let i = 1; i <= 5; i++) {
      createClient(`http://test${i}.de`);
    }
  });

  test('clear client cache using a string parameter', () => {
    const cleared = cache.clear('Client', 'http://test1.fr');
    expect(cleared).toHaveLength(1);
    expect(cleared[0]).toBe<string>('http://test1.fr');
    const remaining = cache.getKeys('Client');
    expect(remaining).toHaveLength(9);
    expect(remaining).not.toContain<string>('http://test1.fr');
  });

  test('clear client cache using an array of strings parameter', () => {
    const cleared = cache.clear('Client', ['http://test1.fr', 'http://test2.fr']);
    expect(cleared).toHaveLength(2);
    expect(cleared).toContain<string>('http://test1.fr');
    expect(cleared).toContain<string>('http://test2.fr');
    const remaining = cache.getKeys('Client');
    expect(remaining).toHaveLength(8);
    expect(remaining).not.toContain<string>('http://test1.fr');
    expect(remaining).not.toContain<string>('http://test2.fr');
  });

  test('clear client cache using an array of strings parameter with double entry', () => {
    const cleared = cache.clear('Client', ['http://test1.fr', 'http://test1.fr']);
    expect(cleared).toHaveLength(1);
    expect(cleared[0]).toBe<string>('http://test1.fr');
    const remaining = cache.getKeys('Client');
    expect(remaining).toHaveLength(9);
    expect(remaining).not.toContain<string>('http://test1.fr');

  });

  test('clear client cache using a regular expression', () => {
    const cleared = cache.clear('Client', new RegExp('http://[a-zA-z0-9]*.fr'));
    expect(cleared).toHaveLength(5);
    expect(cleared).toContain<string>('http://test1.fr');
    expect(cleared).toContain<string>('http://test2.fr');
    expect(cleared).toContain<string>('http://test3.fr');
    expect(cleared).toContain<string>('http://test4.fr');
    expect(cleared).toContain<string>('http://test5.fr');
    const remaining = cache.getKeys('Client');
    expect(remaining).toHaveLength(5);
    expect(remaining).not.toContain<string>('http://test1.fr');
    expect(remaining).not.toContain<string>('http://test2.fr');
    expect(remaining).not.toContain<string>('http://test3.fr');
    expect(remaining).not.toContain<string>('http://test4.fr');
    expect(remaining).not.toContain<string>('http://test5.fr');
  });

});

describe('clear resource cache tests', () => {

  beforeEach(() => {
    cache.reset();

    const promises = new Array<Promise<HalResource>>();
    ['fr', 'de'].forEach((host: string) => {
      const client = createClient(`http://test.${host}/`)
      const scope = nock(`http://test.${host}/`).persist();
      for (let i = 1; i <= 5; i++) {
        const resp = {
          _links: {
            _self: {
              href: `http://test.${host}/personc/${i}`
            }
          },
          _embedded: {
            id: i
          }
        }
        scope
          .get(`/personc/${i}`)
          .reply(200, resp);
        promises.push(client.fetch(`/personc/${i}`, HalResource));
      }
    });
    return Promise.all(promises);
  });

  test('clear resource cache using a string parameter', () => {
    expect(cache.getKeys('Resource')).toHaveLength(10);
    const cleared = cache.clear('Resource', 'http://test.fr/personc/1');
    expect(cleared).toHaveLength(1);
    expect(cleared[0]).toBe<string>('http://test.fr/personc/1');
    const remaining = cache.getKeys('Resource');
    expect(remaining).toHaveLength(9);
    expect(remaining).not.toContain<string>('http://test.fr/personc/1');
  });

  test('clear resource cache using an array of strings parameter', () => {
    expect(cache.getKeys('Resource')).toHaveLength(10);
    const cleared = cache.clear('Resource', ['http://test.fr/personc/1', 'http://test.fr/personc/2']);
    expect(cleared).toHaveLength(2);
    expect(cleared).toContain<string>('http://test.fr/personc/1');
    expect(cleared).toContain<string>('http://test.fr/personc/2');
    const remaining = cache.getKeys('Resource');
    expect(remaining).toHaveLength(8);
    expect(remaining).not.toContain<string>('http://test.fr/personc/1');
    expect(remaining).not.toContain<string>('http://test.fr/personc/2');
  });

  test('clear resource cache using an array of strings parameter with double entry', () => {
    expect(cache.getKeys('Resource')).toHaveLength(10);
    const cleared = cache.clear('Resource', ['http://test.fr/personc/1', 'http://test.fr/personc/1']);
    expect(cleared).toHaveLength(1);
    expect(cleared[0]).toBe<string>('http://test.fr/personc/1');
    const remaining = cache.getKeys('Resource');
    expect(remaining).toHaveLength(9);
    expect(remaining).not.toContain<string>('http://test.fr/personc/1');
  });

  test('clear resource cache using a regular expression', () => {
    expect(cache.getKeys('Resource')).toHaveLength(10);
    const cleared = cache.clear('Resource', new RegExp('http://[a-zA-z0-9]*.fr/personc/[0-9]*'));
    expect(cleared).toHaveLength(5);
    expect(cleared).toContain<string>('http://test.fr/personc/1');
    expect(cleared).toContain<string>('http://test.fr/personc/2');
    expect(cleared).toContain<string>('http://test.fr/personc/3');
    expect(cleared).toContain<string>('http://test.fr/personc/4');
    expect(cleared).toContain<string>('http://test.fr/personc/5');
    const remaining = cache.getKeys('Resource');
    expect(remaining).toHaveLength(5);
    expect(remaining).not.toContain<string>('http://test.fr/personc/1');
    expect(remaining).not.toContain<string>('http://test.fr/personc/2');
    expect(remaining).not.toContain<string>('http://test.fr/personc/3');
    expect(remaining).not.toContain<string>('http://test.fr/personc/4');
    expect(remaining).not.toContain<string>('http://test.fr/personc/5');
  });
});

describe('Still to do tests', () => {

  test.todo('refresh from cache reload from cached object')
  // , () => {
  //   const client = createClient('http://test.fr/');
  //   return client
  //     .fetch('/person/1', Person)
  //     .then((person: Person) => {
  //       expect(person.name).toBe<string>('Project 1');
  //       person.name = 'test';
  //       expect(person.name).toBe<string>('test');
  //       return client
  //         .fetch('/person/1', Person)
  //         .then((fetched: Person) => {
  //           expect(fetched.name).toBe<string>('Project 1');
  //         });
  //     });
  // });

  // TODO understand the caching mechanism before trying to solve these
  test.todo('refresh from cache does not reload from cached object after resetCache')
  //   , () => {

  //     const client = createClient('http://test.fr/');
  //     return client
  //       .fetch('/person/1', Person)
  //       .then((person: Person) => {
  //         expect(person.name).toBe<string>('Project 1');
  //         person.name = 'test';
  //         expect(person.name).toBe<string>('test');
  //         cache.reset();
  //         return client
  //           .fetch('/person/1', Person)
  //           .then((fetched: Person) => {
  //             expect(fetched.name).toBe<string>('Project 1');
  //           });
  //       });
  //   });

  test.todo('chached resource is reused')
  // , () => {
  //   const getResourceSpy = jest.spyOn(cache, 'getResource')
  //   const setResourceSpy = jest.spyOn(cache, 'setResource')
  //   const client = createClient('http://test.fr/');
  //   return client
  //     .fetch('/dummy', HalResource)
  //     .then(() => {
  //       return client
  //         .fetch('/dummy', HalResource)
  //         .then(() => {

  //           expect(cache.getKeys('Resource')).toHaveLength(1);

  //           expect(getResourceSpy).toHaveBeenCalledTimes(1);
  //           expect(setResourceSpy).toHaveBeenCalledTimes(1);
  //           getResourceSpy.mockReset();
  //           getResourceSpy.mockRestore();
  //           setResourceSpy.mockReset();
  //           setResourceSpy.mockRestore();
  //         });
  //     });
  // });


});