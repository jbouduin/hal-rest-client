import * as nock from 'nock';
import { createClient, createResource, HalResource, cache } from '..';
import { PersonFactory } from './data/person-factory';
import { UriBuilder } from './data/uri-builder';
import { Contacts } from './models';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  cache.reset();
  nock.cleanAll();
});

afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('Rest Delete calls', () => {
  const uriBuilder = new UriBuilder();
  const personFactory = new PersonFactory('org', uriBuilder);
  const person = personFactory.createPerson(1);

  test('delete using the URI of a resource', () => {
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .delete(person.relativeUri)
      .reply(204);

    return createClient()
      .delete(person.fullUri)
      .then((result: any) => {
        expect(result.status).toBe<number>(204);
        scope.done();
      });
  });

  test('delete using a HalResource', () => {
    const client = createClient();
    const resource = createResource(client, HalResource, person.fullUri);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .delete(person.relativeUri)
      .reply(204);

    return client
      .delete(resource)
      .then((result: any) => {
        expect(result.status).toBe<number>(204);
        scope.done();
      });
  });

  test('delete returning a json response', () => {
    const client = createClient();
    const resource = createResource(client, HalResource, person.fullUri);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .delete(person.relativeUri)
      .reply(200, { success: 'ok' });

    return client
      .delete(resource)
      .then((result: any) => {
        expect(result.success).toBe<string>('ok');
        scope.done();
      });
  });

  test('read generic halResource response returned by server', () => {
    const contact = personFactory.createContacts(1);
    const client = createClient();
    const resource = createResource(client, HalResource, contact.fullUri);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .delete(contact.relativeUri)
      .reply(200, contact.data);

    return client
      .delete(resource)
      .then((result: any) => {
        expect(result.prop('phone')).toBe<string>('1234567890');
        expect(result.uri.uri).toBe<string>(contact.fullUri);
        scope.done();
      });
  });

  test('read model response returned by server', () => {
    const contact = personFactory.createContacts(1);
    const client = createClient();
    const resource = createResource(client, Contacts, contact.fullUri);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .delete(contact.relativeUri)
      .reply(200, contact.data);

    return resource
      .delete()
      .then((result: any) => {
        expect(result).toBeInstanceOf(Contacts);
        expect(result.prop('phone')).toBe<string>('1234567890');
        expect(result.uri.uri).toBe<string>(contact.fullUri);
      });
  });
});