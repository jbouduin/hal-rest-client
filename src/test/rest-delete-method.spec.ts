import * as nock from 'nock';
import { createClient, createResource, HalResource, cache } from '..';
import { Contacts } from './models';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  cache.reset();
  nock.cleanAll();

  const testNock = nock('http://test.fr/').persist();

  testNock
    .delete('/person/1')
    .reply(204);

  testNock
    .delete('/person/2')
    .reply(200, { success: 'ok' });

  testNock
    .delete('/person/2/contacts')
    .reply(200, {
      _links: {
        self: {
          href: 'http://test.fr/person/2/contacts',
        },
      },
      phone: 'xxxxxxxxxx',
    });
});

afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('Rest Delete calls', () => {

  test('can delete simple person', () => {
    return createClient()
      .delete('http://test.fr/person/1')
      .then((result: any) => {
        expect(result.status).toBe<number>(204);
      });
  });

  test('can delete person using HalResource', () => {
    const client = createClient();
    const resource = createResource(client, HalResource, 'http://test.fr/person/1');
    return client
      .delete(resource)
      .then((result: any) => {
        expect(result.status).toBe<number>(204);
      });
  });

  test('delete return server json response', () => {
    const client = createClient();
    const resource = createResource(client, HalResource, 'http://test.fr/person/2');
    return client
      .delete(resource)
      .then((result: any) => {
        expect(result.success).toBe<string>('ok');
      });
  });

  test('delete read halResource json response', () => {
    const client = createClient();
    const resource = createResource(client, HalResource, 'http://test.fr/person/2/contacts');
    return client
      .delete(resource)
      .then((result: any) => {
        expect(result.prop('phone')).toBe<string>('xxxxxxxxxx');
        expect(result.uri.uri).toBe<string>('http://test.fr/person/2/contacts');
      });
  });

  test('delete read model class json response', () => {
    const client = createClient();
    const resource = createResource(client, Contacts, 'http://test.fr/person/2/contacts');
    return resource
      .delete()
      .then((result: any) => {
        expect(result).toBeInstanceOf(Contacts);
        expect(result.prop('phone')).toBe<string>('xxxxxxxxxx');
        expect(result.uri.uri).toBe<string>('http://test.fr/person/2/contacts');
      });
  });
});