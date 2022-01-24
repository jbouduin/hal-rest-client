import * as nock from 'nock';
import { createClient, createResource, resetCache } from '..';
import { Contacts } from './models/contacts';
import { DashboardInfo, Location, Person } from './models';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  resetCache();

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

  const contacts = {
    _links: {
      self: {
        href: 'http://test.fr/person/2/contacts',
      },
    },
    phone: 'xxxxxxxxxx',
  };

  const home = {
    _links: {
      self: {
        href: 'http://test.fr/person/1/location/home',
      },
    },
    address: 'country',
  };

  const work = {
    _links: {
      self: {
        href: 'http://test.fr/person/1/location/work',
      },
    },
    address: 'city',
  };

  const dashBoardInfo = {
    _links: {
      self: {
        href: "http://test.fr/dashboard",
        type: "application/hal+json",
      },
    },
    name: "test",
  };

  const testNock = nock('http://test.fr/').persist();

  testNock
    .get('/person/1')
    .reply(200, person1);
  testNock
    .get('/person/1')
    .reply(200, person1);
  testNock
    .get('/person/2/contacts')
    .reply(200, contacts);
  testNock
    .get('/person/1/location/home')
    .reply(200, home);
  testNock
    .get('/person/1/location/work')
    .reply(200, work);
  testNock
    .get('/persons')
    .reply(200, {
      _embedded: { persons: [JSON.parse(JSON.stringify(person1))] },
      _links: { self: { href: 'http://test.fr/person' } },
    });
  testNock
    .get('/personsSimpleArray')
    .reply(200, [JSON.parse(JSON.stringify(person1)), {
      _links: {
        self: {
          href: 'http://test.fr/person/13',
        },
      },
      name: null,
    }]);

  testNock
    .get("/dashboard")
    .reply(200, dashBoardInfo);

});

afterAll(() => nock.restore());
afterEach(() => {
  resetCache();
});
//#endregion

describe('Resource class tests', () => {
  test('can get single string prop', () => {

    const client = createClient('http://test.fr/');
    return client
      .fetch('/person/1', Person)
      .then((person: Person) => {

        // person
        expect(person.name).toBe<string>('Project 1');
        expect(person.bestFriend).toBeInstanceOf(Person);
        expect(person.mother instanceof Person);
        expect(person.father instanceof Person);
        expect(person.bestFriend.name).toBe<string>('My bestfriend');
        person.name = 'Toto';
        expect(person.name).toBe<string>('Toto');

        // friends
        expect(person.myFriends).toHaveLength(1);
        for (const friend of person.myFriends) {
          expect(friend.name).toBe<string>('Thomas');
        }

        // contacts
        expect(person.contacts.phone).toBeUndefined();
        expect(person.home.address).toBeUndefined()
        expect(person.work.address).toBeUndefined()
        return Promise
          .all([
            person.contacts.fetch(),
            person.home.fetch(),
            person.work.fetch()
          ])
          .then((value: [Contacts, Location, Location]) => {
            expect(person.contacts.phone).toBe<string>('xxxxxxxxxx');
            expect(value[0]).toBeInstanceOf(Contacts);
            expect(value[0].phone).toBe<string>('xxxxxxxxxx');
            expect(person.home.address).toBe<string>('country');
            expect(person.work.address).toBe<string>('city');
          });
      });
  });

  test('can fetch Array of Person', () => {
    return createClient('http://test.fr/')
      .fetchArray('/persons', Person)
      .then((persons: Array<Person>) => {
        expect(persons).toHaveLength(1);
        expect(persons[0]).toBeInstanceOf(Person);
        expect(persons[0].name).toBe<string>('Project 1');
      });
  });


  test('non-hal resource array throws exception', () => {
    expect.assertions(1);
    return createClient('http://test.fr/')
      .fetchArray('/person/1', Person)
      .catch(e => {
        expect(e.message).toBe<string>('property _embedded.best-friend is not an array');
      });
  });

  test('hal-resource with wrong format throws exception', () => {
    expect.assertions(1);
    return createClient('http://test.fr/')
      .fetchArray('/person/2/contacts', Contacts)
      .catch(e => {
        expect(e.message).toBe<string>('unparsable array. it\'s neither an array nor an halResource');
      });
  });

  test('fetch simple Array of Person', () => {
    return createClient('http://test.fr/')
      .fetchArray('/personsSimpleArray', Person)
      .then((persons: Array<Person>) => {
        expect(persons).toHaveLength(2);
        expect(persons[0]).toBeInstanceOf(Person);
        expect(persons[0].name).toBe<string>('Project 1');
        expect(persons[1].name).toBeNull();
      });
  });

  test('set property of type object', () => {
    const client = createClient('http://test.fr/');
    return client
      .fetch('/person/1', Person)
      .then((person: Person) => {
        expect(person.name).toBe<string>('Project 1');
        person.name = 'test';
        expect(person.name).toBe<string>('test');
        const contacts = createResource(client, Contacts, '/contacInfos/3');
        person.contacts = contacts;
        expect(person.contacts).toBe<Contacts>(contacts);
      });
  });

  test("Issue 7: HalResource restClient is protected", () => {
    return createClient("http://test.fr")
      .fetch("/dashboard", DashboardInfo)
      .then((dashboard: DashboardInfo) => {
        expect(dashboard.getHalRestClientInfo()).toBe<string>("http://test.fr");
      });
  });

});
