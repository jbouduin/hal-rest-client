import * as nock from 'nock';
import { createClient, HalResource, cache } from '..';
import { DataFactory, IData, IEmbeddedCollection, ILinkCollection, IScopeResult } from './data/data-factory';
import { UriBuilder } from './data/uri-builder';

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

describe('Resources with no \'self\'', () => {
  const uriBuilder = new UriBuilder();
  const dataFactory = new DataFactory(uriBuilder);
  const baseUri = uriBuilder.orgBaseURI;
  const otherLink = uriBuilder.resourceUri('org', true, 'other', 1);
  const scope = nock(baseUri).persist();

  let resourceWithoutSelf: IScopeResult<IData>;
  beforeAll(() => {
    const data: IEmbeddedCollection = { name: 'test'};
    const links: ILinkCollection = {
      other: {
        href: otherLink
      }
    };
    resourceWithoutSelf = dataFactory.createResourceData('org', 'resource', 1, data, links);
    delete resourceWithoutSelf.result._links.self;
    scope
      .get(resourceWithoutSelf.resourceUri)
      .reply(200, resourceWithoutSelf.result);

  });

  test('fetch a resource withouth \'self\' link', () => {
    return createClient(baseUri)
      .fetchResource(resourceWithoutSelf.resourceUri)
      .then((resource: HalResource) => {
        expect(resource.uri).toBeUndefined();
        expect(resource.prop('id')).toBe<number>(1);
        expect(resource.prop('name')).toBe<string>('test');
        const cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(otherLink);
      });
  });

  test('forced re-fetch a resource withouth \'self\' link', () => {
    return createClient(baseUri)
      .fetchResource(resourceWithoutSelf.resourceUri)
      .then((resource: HalResource) => {
        return resource
          .fetch(true)
          .then((fetched: HalResource) => {
            expect(fetched.uri).toBeUndefined();
            expect(fetched.prop('id')).toBe<number>(1);
            expect(fetched.prop('name')).toBe<string>('test');
            const cacheKeys = cache.getKeys('Resource');
            expect(cacheKeys).toHaveLength(1);
            expect(cacheKeys[0]).toBe<string>(otherLink);
            expect(fetched).toBe(resource);
          });
      });
  });

  test.only('fetch entity with self-less subresource', () => {
    const resourceWithSubResourceWithoutSelf = dataFactory.createResourceData(
      'org',
      'withsubresource',
      1,
      {
        name: 'parent',
        child: resourceWithoutSelf.result
      }
    );
    scope
      .get(resourceWithSubResourceWithoutSelf.resourceUri)
      .reply(200, resourceWithSubResourceWithoutSelf.result);

    return createClient(baseUri)
      .fetchResource(resourceWithSubResourceWithoutSelf.resourceUri)
      .then((resource: HalResource) => {
        const subResourceWithoutSelf = resource.prop('child');
        expect(subResourceWithoutSelf.uri).toBeUndefined();
        const cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(2);
        expect(cacheKeys).toContain<string>(otherLink);
        expect(cacheKeys).toContain<string>(resourceWithSubResourceWithoutSelf.selfUri);
      });
  });
});