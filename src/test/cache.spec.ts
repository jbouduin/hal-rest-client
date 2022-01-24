import * as nock from 'nock';
import { createClient, HalResource, resetCache } from '..';

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
});