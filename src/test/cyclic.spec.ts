import * as nock from 'nock';
import { createClient, cache } from '..';
import { CyclicalList } from './models';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  cache.reset();

  const cyclicals = {
    _embedded: {
      cyclicals: [
        {
          _links: {
            self: 'http://test.fr/cyclicals/1',
          },
          property: 'name',
        },
      ],
    },
    _links: {
      refresh: 'http://test.fr/cyclicals/refresh',
      self: 'http://test.fr/cyclicals',
    },
  };

  const scope = nock('http://test.fr/').persist();
  scope
    .get('/cyclicals')
    .reply(200, cyclicals);

  scope
    .get('/cyclicals/refresh')
    .reply(200, cyclicals);

  scope
    .get('/cyclicals/refresh')
    .reply(200, cyclicals);

});

afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('Cyclical ojbects', () => {
  test('Cyclical property have the correct class type', () => {

    const client = createClient('http://test.fr/');
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
