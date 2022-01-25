import * as nock from 'nock';
import { createClient, HalResource, resetCache } from "..";
import { Person, Contacts } from "./models";

//#region setup/teardown ------------------------------------------------------
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

  const contacts = {
    _links: {
      self: {
        href: 'http://test.fr/person/2/contacts',
      },
    },
    phone: 'xxxxxxxxxx',
  };

  const scope = nock('http://test.fr/').persist();

  scope
    .get('/persons')
    .reply(200, {
      _embedded: { persons: [JSON.parse(JSON.stringify(person1))] },
      _links: { self: { href: 'http://test.fr/person' } },
    });

  scope
    .get('/person/1')
    .reply(200, person1);

  scope
    .get('/personsSimpleArray')
    .reply(200, [JSON.parse(JSON.stringify(person1)), {
      _links: {
        self: {
          href: 'http://test.fr/person/13',
        },
      },
      name: null,
    }]);

  scope
    .get('/person/2/contacts')
    .reply(200, contacts);

  scope
    .get('/empty-embedded')
    .reply(200, { _embedded: {}});
});

afterAll(() => nock.restore());
afterEach(() => {
  resetCache();
});
//#endregion

describe('Fetching arrays', () => {
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
        expect(e.message).toBe<string>('Unparsable array: it\'s neither an array nor an halResource');
      });
  });

  test('empty _embedded throws exception', () => {
    expect.assertions(1);
    return createClient('http://test.fr/')
      .fetchArray('/empty-embedded', HalResource)
      .catch(e => {
        expect(e.message).toBe<string>('property _embedded does not contain an array');
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
});