import * as nock from 'nock';
import { Person } from './models';
import { createClient, getCacheKeys, HalResource, resetCache } from '..';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  resetCache();

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
  resetCache();
});
//#endregion

describe('Cache', () => {
  test('Issue 30: lists are refreshed when calling fetchArray', () => {
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


  test.todo('refresh from cache does not reload from cached object after resetCache')
  //   , () => {

  //     const client = createClient('http://test.fr/');
  //     return client
  //       .fetch('/person/1', Person)
  //       .then((person: Person) => {
  //         expect(person.name).toBe<string>('Project 1');
  //         person.name = 'test';
  //         expect(person.name).toBe<string>('test');
  //         resetCache();
  //         return client
  //           .fetch('/person/1', Person)
  //           .then((fetched: Person) => {
  //             expect(fetched.name).toBe<string>('Project 1');
  //           });
  //       });
  //   });

  test('Fetched resource is cached', () => {
    const client = createClient('http://test.fr/');
    return client
      .fetch('dummy', HalResource)
      .then(() => {
        expect(getCacheKeys('Resource')).toContain<string>('http://test.fr/dummy');
      })
  });

  test('Client created with URI is cached', () => {
    createClient('http://test.fr/');
    expect(getCacheKeys('Client')).toContain('http://test.fr/');
    expect(getCacheKeys('Client')).toHaveLength(1);
  });

  test('Client created without URI is cached', () => {
    createClient();
    expect(getCacheKeys('Client')).toHaveLength(0);
  });

  test('Reset cache without parameter clears both caches', () => {
    const client = createClient('http://test.fr/');
    return client
      .fetch('/dummy', HalResource)
      .then(() => {
        resetCache();
        expect(getCacheKeys('Client')).toHaveLength(0);
        expect(getCacheKeys('Resource')).toHaveLength(0);
      })
  });

  test('Reset cache with parameter \'Client\' clears only client cache', () => {
    const client = createClient('http://test.fr/');
    return client
      .fetch('/dummy', HalResource)
      .then(() => {
        resetCache('Client');
        expect(getCacheKeys('Client')).toHaveLength(0);
        expect(getCacheKeys('Resource')).toHaveLength(1);
      })
  });

  test('Reset cache with parameter \'Resource\' clears only client cache', () => {
    const client = createClient('http://test.fr/');
    return client
      .fetch('/dummy', HalResource)
      .then(() => {
        resetCache('Resource');
        expect(getCacheKeys('Client')).toHaveLength(1);
        expect(getCacheKeys('Resource')).toHaveLength(0);
      })
  });
});