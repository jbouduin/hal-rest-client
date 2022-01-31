import * as nock from 'nock';
import { createClient, cache } from '..';
import { IListData, ILinkCollection, ILink, IQueryParameters } from './data/common-definitions';
import { DataFactory } from './data/data-factory';
import { UriBuilder } from './data/uri-builder';
import { CyclicalList } from './models';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  cache.reset();
});

afterAll(() => nock.restore());

//#endregion

describe('Cyclical ojbects', () => {
  test('Cyclical property have the correct class type', () => {
    const uriBuilder = new UriBuilder()
    const dataFactory = new DataFactory(uriBuilder);
    const cyclical1 = dataFactory.createResourceData('org', 'cyclicals', 1, { property: 'name'});
    const queryParameters: IQueryParameters = {
      sort: 'id',
      offset: 0,
      pageSize: 20,
    };
    const listData: IListData = {
      queryParameters,
      listKey: 'cyclicals',
      listData: [cyclical1.data]
    };

    const refreshUri = uriBuilder.resourceUri('org', true, 'cyclicals', undefined, 'refresh');
    const refreshLink: ILink = { href: refreshUri };
    const links: ILinkCollection = { refresh: refreshLink };

    const cyclicals = dataFactory.createResourceListData('org', 'cyclicals', listData, links);
    const baseUri = uriBuilder.orgBaseURI;
    const scope = nock(baseUri);
    scope
      .get(cyclical1.relativeUri)
      .reply(200, cyclicals.data);
    scope
      .get(refreshLink.href)
      .reply(200, cyclicals.data);

    const client = createClient(baseUri);
    return client
      .fetch(cyclical1.relativeUri, CyclicalList)
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
                scope.done();
              });
          });
      });
  });
});
