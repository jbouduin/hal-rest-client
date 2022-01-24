import { createClient, createResource, HalResource, resetCache } from '..';
import * as nock from 'nock';

const basePath = 'http://test.fr/';

describe('Test Rest create api', () => {
  test('can create person using rest-client', () => {
    const client = createClient();

    const scope = nock(basePath)
      .post('/persons', { name: 'ThoMas' })
      .reply(200, { name: 'Thomas', _links: { self: { url: 'http://test.fr/persons/2' } } });

    return client.create('http://test.fr/persons', { name: 'ThoMas' })
      .then((resource: any) => {
        expect(resource.prop('name')).toBe<string>('Thomas');
        scope.done();
      });
  });

  test('can create person using HalResource', () => {
    const client = createClient();
    let resource = createResource(client, HalResource, 'http://test.fr/persons');
    resource.prop('name', 'ThoMas');
    const scope = nock(basePath)
      .post('/persons', { name: 'ThoMas' })
      .reply(200, { name: 'Thomas', _links: { self: { url: 'http://test.fr/persons/2' } } });

    return resource.create().then((response: any) => {
      expect(response.prop('name')).toBe<string>('Thomas');
      scope.done();
    });
  });
});
