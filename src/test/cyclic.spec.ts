import * as nock from 'nock';
import { createClient, cache } from '..';
import { DataFactory, IListData, ILinkCollection } from './data/data-factory';
import { UriBuilder } from './data/uri-builder';
import { CyclicalList } from './models';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  cache.reset();
});

afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('Cyclical ojbects', () => {
  test('Cyclical property have the correct class type', () => {
    const uriBuilder = new UriBuilder()
    const dataFactory = new DataFactory(uriBuilder);
    const cyclical1 = dataFactory.createResourceData('org', 'cyclicals', 1, { property: 'name'});
    const listData: IListData = {
      sort: 'id',
      offset: 0,
      listKey: 'cyclicals',
      listData: [cyclical1.result]
    };

    const refresh = uriBuilder.resourceUri('org', true, 'cyclicals', undefined, 'refresh');
    const links: ILinkCollection = {
      refresh: { href: refresh }
    }

    const cyclicals = dataFactory.createResourceListData('org', 'cyclicals', listData, links);
    const baseUri = uriBuilder.orgBaseURI;
    const scope = nock(baseUri);
    scope
      .get(cyclicals.resourceUri)
      .reply(200, cyclicals.result);

    scope
      .get(cyclicals.result._links.refresh.href)
      .reply(200, cyclicals.result);

    scope
      .get(cyclicals.result._links.refresh.href)
      .reply(200, cyclicals.result);

    const client = createClient(baseUri);
    return client
      .fetch('/cyclicals', CyclicalList)
      .then((cyclicals: CyclicalList) => {
        expect(cyclicals).toBeInstanceOf(CyclicalList);
        expect(cyclicals.refresh).toBeInstanceOf(CyclicalList);
        expect(cyclicals.cyclicals).toBeInstanceOf(Array);
        expect(cyclicals.cyclicals[0].property).toBe<string>('name');
        return cyclicals.refresh
          .fetch()
          .then((level2: CyclicalList) => {
            expect(level2).toBeInstanceOf(CyclicalList);
            expect(level2.refresh).toBeInstanceOf(CyclicalList);
            expect(level2.cyclicals).toBeInstanceOf(Array);
            expect(level2.cyclicals[0].property).toBe<string>('name');
            return cyclicals.refresh
              .fetch()
              .then((level3: CyclicalList) => {
                expect(level3).toBeInstanceOf(CyclicalList);
                expect(level3.refresh).toBeInstanceOf(CyclicalList);
                expect(level3.cyclicals).toBeInstanceOf(Array);
                expect(level3.cyclicals[0].property).toBe<string>('name');
              });
          });
      });
  });
});
