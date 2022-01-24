import { createClient, HalResource, resetCache } from '..';

import * as nock from 'nock';
beforeAll(() => {
  nock.cleanAll();
  resetCache();

  const scope = nock('http://test.fr/', {
    reqheaders: {
      authorization: 'Basic Auth',
    },
  }).persist();

  scope
    .get('/me')
    .reply(200, {
      _links: {
        self: { href: '/me' },
      },
      name: 'Thomas',
    });

});

describe('test headers', () => {
  test('loader with header on constructor', () => {
    return createClient('http://test.fr/', { headers: { authorization: 'Basic Auth' } })
      .fetch('http://test.fr/me', HalResource)
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('Thomas');
      });
  });

  test('loader with header with config method', () => {
    const client = createClient('http://test.fr/');
    client.config.headers.common.authorization = 'Basic Auth';
    return client
      .fetchResource('http://test.fr/me')
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('Thomas');
      });
  });

  test('loader with header with addHeader method', () => {

    return createClient('http://test.fr/')
      .addHeader('authorization', 'Basic Auth')
      .fetchResource('http://test.fr/me')
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('Thomas');
      });
  });
})