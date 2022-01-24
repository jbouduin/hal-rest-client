import * as nock from 'nock';
import { createClient, HalResource, resetCache } from '..';


// mock list response
beforeAll(() => {
  nock.cleanAll();
  resetCache();

  const templatedSelf = {
    _embedded: {
      data: [
        {
          _links: {
            href: '/data/test',
          },
          name: 'test',
        },
      ],
    },
    _links: {
      find: {
        href: '/data{?q}',
        templated: true,
      },
      findById: {
        href: '/data{/id}',
        templated: true,
      },
      self: {
        href: 'http://test.fr/data{?page,size,sort}',
        template: true,
      },
    },
  };

  const findResult = {
    _embedded: {
      data: [
        {
          _links: {
            href: '/data/test',
          },
          name: 'test',
        },
      ],
    },
    _links: {
      self: {
        href: 'http://test.fr/q=test',
      },
    },
  };

  const byIdResult = {
    _links: {
      self: {
        href: 'http://test.fr/data/demo',
      },
    },
    test: 'demo',
  };

  const dataWithoutParameters = {
    _links: {
      self: {
        href: 'http://test.fr/data',
      },
    },
    test: 'emptyData',
  };

  const testNock = nock('http://test.fr/').persist();

  testNock
    .get('/data?page=1')
    .reply(200, templatedSelf);

  testNock
    .get('/data/demo')
    .reply(200, byIdResult);

  testNock
    .get('/data')
    .reply(200, dataWithoutParameters);

  testNock
    .delete('/data?page=1')
    .reply(200, 'deleteOK');

  testNock
    .get('/data?q=test')
    .reply(200, findResult);
});

afterAll(() => nock.restore());
afterEach(() => {
  resetCache();
});

describe('Templated links', () => {
  test('can fetch resource with self templated link', () => {
    return createClient('http://test.fr/')
      .fetchResource('/data?page=1')
      .then((resource: HalResource) => {
        expect(resource.uri.uri).toBe<string>('http://test.fr/data{?page,size,sort}');
        // TODO check here (same issue with other tests: fetched uri is the fetchResource parameter and the original test expected the complete URI)
        expect(resource.uri.fetchedURI).toBe<string>('/data?page=1');
        expect(resource.prop('data')).toHaveLength(1);
      });
  });

  test('can fetch resource with self templated link', () => {
    return createClient()
      .fetchResource('http://test.fr/data?page=1')
      .then((resource: HalResource) => {
        expect(resource.uri.uri).toBe<string>('http://test.fr/data{?page,size,sort}');
        expect(resource.uri.fetchedURI).toBe<string>('http://test.fr/data?page=1');
        expect(resource.prop('data')).toHaveLength(1);
      });
  });

  test('can fetch link using parameters', () => {
    return createClient('http://test.fr/')
      .fetchResource('/data?page=1')
      .then((resource: HalResource) => {
        const findLink = resource.link('find');
        expect(findLink.uri.templated).toBe<boolean>(true);
        expect(findLink.uri.fetchedURI).toBe<string>('');
        return findLink
          .fetch({ q: 'test' })
          .then((found: HalResource) => {
            expect(found.prop('data')[0].prop('name')).toBe<string>('test');
            expect(found.uri.fetchedURI).toBe<string>('/data?q=test');
          });
      });
  });

  test('can fetch with parameter clean templated URI', () => {
    return createClient('http://test.fr/')
      .fetchResource('/data?page=1')
      .then((resource: HalResource) => {
        const findLink = resource.link('find');
        return findLink
          .fetch()
          .then((found: HalResource) => {
            expect(found.prop('test')).toBe<string>('emptyData');
            expect(found.uri.fetchedURI).toBe<string>('/data');
          });
      });
  });

  test('can use path parameter', () => {
    return createClient('http://test.fr/')
      .fetchResource('/data?page=1')
      .then((resource: HalResource) => {
        return resource
          .link('findById').fetch({ id: 'demo' })
          .then((fetched: HalResource) => {
            expect(fetched.prop('test')).toBe<string>('demo');
          });
      });
  });
});