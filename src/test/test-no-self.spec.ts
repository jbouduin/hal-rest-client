import * as nock from 'nock';
import { createClient, HalResource, cache } from '..';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  cache.reset();

  const noSelfResource = {
    _links: {
      other: {
        href: 'http://test.fr/other'
      },
    },
    name: 'test',
  };

  const withSubResourceWithoutSelf = {
    _embedded: {
      commessa: [
        {
          _links: {
            self: {
              href: 'http://localhost:8180/registrazioni/data/commessa/24'
            },
          },
          descrizione: 'GIRARDI ELDA',
          lavorazioni: [
            {
              _links: {
                commessa: {
                  href: 'http://test.fr/testResource'
                },
                lavorazione: {
                  href: 'http://test.fr/testResource2'
                },
              },
            },
          ],
        },
      ],
    },
    _links: {
      self: {
        href: 'http://test.fr/registrazioni/data/commessa{?page,size,sort}',
        templated: true,
      },
    },
  };

  const testNock = nock('http://test.fr/').persist();

  testNock
    .get('/testResource')
    .reply(200, noSelfResource);

  testNock
    .get('/withSubResourceWithoutSelf')
    .reply(200, withSubResourceWithoutSelf);
});

afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('Issue 10: Testing resources with no "self"', () => {
  test('can fetch resource withouth self link', () => {
    return createClient('http://test.fr/')
      .fetchResource('/testResource')
      .then((resource: HalResource) => {
        expect(resource.uri).toBeUndefined();
        expect(resource.prop('name')).toBe<string>('test');
      });
  });

  test('can call fetch without error on an resource', () => {
    return createClient('http://test.fr/')
      .fetchResource('/testResource')
      .then((resource: HalResource) => {
        return resource
          .fetch(true)
          .then((fetched: HalResource) => {
            expect(fetched).toBe(resource);
          });
      });
  });

  test('can fetch entity with subresource', () => {
    return createClient('http://test.fr/')
      .fetchResource('/withSubResourceWithoutSelf')
      .then((resource: HalResource) => {
        const subResourceWithoutSelf = resource.prop('commessa')[0].prop('lavorazioni')[0];
        expect(subResourceWithoutSelf.uri).toBeUndefined();
        return subResourceWithoutSelf.prop('commessa')
          .fetch()
          .then((commessa: HalResource) => {
            expect(commessa.prop('name')).toBe<string>('test');
          });
      });
  });
});