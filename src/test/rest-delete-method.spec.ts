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
      .delete(person.absoluteUri)
      .then((result: Record<string, string>) => {
        expect(result.status).toBe<number>(204);
        scope.done();
      });
  });

  test('delete using a HalResource', () => {
    const client = createClient();
    const resource = createResource(client, HalResource, person.absoluteUri);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .delete(person.relativeUri)
      .reply(204);

    return client
      .delete(resource)
      .then((result: Record<string, string>) => {
        expect(result.status).toBe<number>(204);
        scope.done();
      });
  });

  test('delete returning a json response', () => {
    const client = createClient();
    const resource = createResource(client, HalResource, person.absoluteUri);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .delete(person.relativeUri)
      .reply(200, { success: 'ok' });

    return client
      .delete(resource)
      .then((result: Record<string, string>) => {
        expect(result.success).toBe<string>('ok');
        scope.done();
      });
  });

  test('read generic halResource response returned by server', () => {
    const contact = personFactory.createContacts(1);
    const client = createClient();
    const resource = createResource(client, HalResource, contact.absoluteUri);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .delete(contact.relativeUri)
      .reply(200, contact.data);

    return client
      .delete(resource, HalResource)
      .then((result: HalResource) => {
        expect(result.getProp('phone')).toBe<string>('1234567890');
        expect(result['_uri'].href).toBe<string>(contact.absoluteUri);
        scope.done();
      });
  });

  test('read model response returned by server', () => {
    const contact = personFactory.createContacts(1);
    const client = createClient();
    const resource = createResource(client, Contacts, contact.absoluteUri);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .delete(contact.relativeUri)
      .reply(200, contact.data);

    return resource
      .delete(Contacts)
      .then((result: Contacts) => {
        expect(result).toBeInstanceOf(Contacts);
        expect(result.getProp('phone')).toBe<string>('1234567890');
        expect(result['_uri'].href).toBe<string>(contact.absoluteUri);
      });
  });
});