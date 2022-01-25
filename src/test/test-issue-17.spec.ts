import * as nock from 'nock';
import { createClient, HalResource, resetCache } from '..';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  resetCache();

  const resource = {
    _links: {
      other: {
        href: 'http://test.fr/other',
        type: 'application/json',
      },
      self: {
        href: 'http://test.fr/testResource',
      },
    },
    name: 'test',
  };

  const other = {
    _links: {
      self: {
        href: 'http://test.fr/other',
      },
    },
    name: 'other',
  };

  const scope = nock('http://test.fr/').persist();

  scope
    .get('/testResource')
    .reply(200, resource);

  scope
    .get('/other')
    .reply(200, other);
});

afterAll(() => nock.restore());
afterEach(() => {
  resetCache();
});
//#endregion

describe('Additional properties of a link', () => {
  test('Issue 17: get property of a non-fetched link', () => {

    return createClient('http://test.fr/')
      .fetchResource('/testResource')
      .then((resource: HalResource) => {
        expect(resource.link('other').prop('type')).toBe<string>('application/json');
      });
  });

  test('Issue 17: can get link prop after fetch done', () => {

    return createClient('http://test.fr/')
      .fetchResource('/testResource')
      .then((resource: HalResource) => {
        return resource.link('other')
          .fetch()
          .then((link: HalResource) => {
            expect(link.prop('type')).toBe<string>('application/json');
            expect(link.prop('name')).toBe<string>('other');
          });
      });
  });
});