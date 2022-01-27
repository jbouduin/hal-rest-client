import { createClient, HalResource, cache } from '..';
import * as nock from 'nock';

const basePath = 'http://test.fr/';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  cache.reset();
  nock.cleanAll();

  const newBestFriend = {
    _links: {
      self: {
        href: 'http://test.fr/person/12',
      },
    },
    name: 'New bestfriend',
  };

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
    },
    _links: {
      contacts: {
        href: 'http://test.fr/person/2/contacts',
      },
      project: {
        href: 'http://test.fr/project/4',
      },
      self: {
        href: 'http://test.fr/person/1',
      },
    },
    name: 'Person 1',
    dummy: 'dummy'
  };

  const project5 = {
    _links: {
      self: {
        href: 'http://test.fr/project/5',
      },
    },
    name: 'Project 5',
  };

  const contacts = {
    _links: {
      self: {
        href: 'http://test.fr/person/2/contacts',
      },
    },
    phone: 'xxxxxxxxxx',
  };

  const testNock = nock(basePath).persist();

  testNock
    .get('/person/1')
    .reply(200, person1);

  testNock
    .get('/person/12')
    .reply(200, newBestFriend);

  testNock
    .get('/person/2/contacts')
    .reply(200, contacts);

  testNock
    .get('/project/5')
    .reply(200, project5);
});

afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('Rest update calls', () => {
  test('can update person using HalResource', async () => {
    const client = createClient();

    return Promise
      .all([
        client.fetchResource('http://test.fr/person/1'),
        client.fetchResource('http://test.fr/person/12')
      ])
      .then((resources: [HalResource, HalResource]) => {
        resources[0].prop('name', 'test');
        resources[0].prop('best-friend', resources[1]);
        const scope = nock(basePath)
          .intercept('/person/1', 'PATCH', { 'name': 'test', 'best-friend': 'http://test.fr/person/12' })
          .reply(200);
        return resources[0]
          .update()
          .then((result: any) => {
            expect(result.status).toBe<number>(200);
            scope.done();
          });
      });
  });

  test('can update link using HalResource', () => {
    const client = createClient();
    return client
      .fetchResource('http://test.fr/person/1')
      .then((resource: HalResource) => {
        return resource.prop('contacts')
          .fetch()
          .then(() => resource);
      })
      .then((resource: HalResource) => {
        resource.prop('name', 'test');
        resource.prop('contacts').prop('phone', '06XX1245XX');
        const scope = nock(basePath)
          .intercept('/person/1', 'PATCH', { name: 'test' })
          .reply(200);
        scope
          .intercept('/person/2/contacts', 'PATCH', { phone: '06XX1245XX' })
          .reply(200);
        return Promise
          .all([
            resource.update(),
            resource.prop('contacts').update()
          ])
          .then((result: [any, any]) => {
            expect(result[0].status).toBe<number>(200);
            expect(result[1].status).toBe<number>(200);
            scope.done();
          });
      });
  });

  test('can update new link of a HalResource', () => {
    const client = createClient('http://test.fr');
    return Promise
      .all([
        client.fetchResource('/person/1'),
        client.fetchResource('/project/5')
      ])
      .then((resources: [HalResource, HalResource]) => {
        resources[0].prop('name', 'new name');
        resources[0].prop('project', resources[1]);
        const scope = nock(basePath)
          .intercept('/person/1', 'PATCH', { name: 'new name', project: 'http://test.fr/project/5' })
          .reply(200);
        return resources[0].update()
          .then((result: any) => {
            expect(result.status).toBe<number>(200);
            scope.done();
          });
      });
  });

  test('can update undefined prop and link', () => {
    const client = createClient('http://test.fr');
    return client
      .fetchResource('/person/1')
      .then((resource: HalResource) => {
        resource.prop('name', null);
        resource.prop('project', null);

        const scope = nock(basePath)
          .intercept('/person/1', 'PATCH', { name: undefined, project: undefined })
          .reply(200);
        return resource.update()
          .then((result: any) => {
            expect(result.status).toBe<number>(200);
            scope.done();
          });
      });
  });

  test('can update with custom serializer', () => {
    const client = createClient('http://test.fr');
    return Promise
      .all([
        client.fetchResource('/person/1'),
        client.fetchResource('/project/5')
      ])
      .then((result: [HalResource, HalResource]) => {
        result[0].prop('name', 'test');
        result[0].prop('project', result[1]);
        const scope = nock(basePath)
          .intercept('/person/1', 'PATCH', { name: 'serializer.test', project: 'serializer2.http://test.fr/project/5' })
          .reply(200);
        return result[0]
          .update({
            parseProp: (value: string) => 'serializer.' + value,
            parseResource: (value: { uri: { uri: string; }; }) => 'serializer2.' + value.uri.uri,
          })
          .then((result2: any) => {
            expect(result2.status).toBe<number>(200);
            scope.done();
          });
      });
  });

  test('can update and get resource updated', () => {
    const client = createClient('http://test.fr');
    return Promise
      .all([
        client.fetchResource('/person/1'),
        client.fetchResource('/project/5')
      ])
      .then((resources: [HalResource, HalResource]) => {
        resources[0].prop('name', 'test');
        resources[0].prop('project', resources[1]);

        const scope = nock(basePath)
          .intercept('/person/1', 'PATCH', { name: 'test', project: 'http://test.fr/project/5' })
          .reply(200, { name: 'test', _links: { self: { url: 'http://test.fr/person/1' } } });

        return resources[0]
          .update()
          .then((result: HalResource) => {
            expect(result.prop('name')).toBe<string>('test');
            scope.done();
          });
      });
  });

  test('can call update with hal-client', () => {
    const client = createClient('http://test.fr');
    const scope = nock(basePath)
      .intercept('/person/1', 'PATCH', { name: 'test' })
      .reply(200, { name: 'test', _links: { self: { url: 'http://test.fr/person/1' } } });

    return client
      .update('http://test.fr/person/1', { name: 'test' })
      .then((result: HalResource) => {
        expect(result.prop('name')).toBe<string>('test');
        scope.done();
      });
  });

  test('can call put update with hal-client', () => {
    const client = createClient('http://test.fr');
    const scope = nock(basePath)
      .intercept('/person/1', 'PUT', { name: 'test' })
      .reply(200, { name: 'test', _links: { self: { url: 'http://test.fr/person/1' } } });

    return client
      .update('http://test.fr/person/1', { name: 'test' }, true)
      .then((result: HalResource) => {
        expect(result.prop('name')).toBe<string>('test');
        scope.done();
      });
  });
});