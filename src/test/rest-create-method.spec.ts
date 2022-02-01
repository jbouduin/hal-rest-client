import * as nock from 'nock';
import { createClient, createResource, HalResource } from '..';
import { UriBuilder } from './data/uri-builder';

describe('Test Rest create api', () => {
  const uriBuilder = new UriBuilder();
  const nameSubmitted = 'FANNY';
  const nameSaved = 'Fanny';
  const endpoint = uriBuilder.resourceUri('org', false, 'persons');
  const personUri = uriBuilder.resourceUri('org', false, 'persons', 1);

  test('create person using rest-client', () => {
    const client = createClient();

    const scope = nock(uriBuilder.orgBaseURI)
      .post('/persons', { name: nameSubmitted })
      .reply(200, { name: nameSaved, _links: { self: { href: personUri } } });

    return client.create(endpoint, { name: nameSubmitted }, HalResource)
      .then((resource: HalResource) => {
        expect(resource.prop('name')).toBe<string>(nameSaved);
        scope.done();
      });
  });

  test('create person using HalResource', () => {
    const client = createClient();
    const resource = createResource(client, HalResource, endpoint);
    resource.prop('name', nameSubmitted);
    const scope = nock(uriBuilder.orgBaseURI)
      .post('/persons', { name: nameSubmitted })
      .reply(200, { name: nameSaved, _links: { self: { href: personUri } } });

    return resource.create(HalResource).then((response: any) => {
      expect(response.prop('name')).toBe<string>(nameSaved);
      scope.done();
    });
  });

  test.todo('create person using Halresource and receive personmodel back');
  test.todo('create person using Halrestclient and receive personmodel back');
  test.todo('create person using Halresource and receive json back');
  test.todo('create person using Halrestclient and receive json back');
  test.todo('create person using Halresource and receive status back');
  test.todo('create person using Halrestclient and receive status back');

});
