import * as nock from 'nock';
import { createClient, HalProperty, HalResource, cache } from '..';

class DashboardInfo extends HalResource {
  @HalProperty()
  public name: string;
}

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  cache.reset();

  const spa = {
    _links: {
      dashboardInfos: {
        href: 'http://test.fr/dashboard',
        type: 'application/hal+json',
      },
      self: {
        href: 'http://test.fr/spa',
        type: 'application/hal+json',
      },
    },
  };

  const dashBoardInfo = {
    _links: {
      self: {
        href: 'http://test.fr/dashboard',
        type: 'application/hal+json',
      },
    },
    name: 'test',
  };

  const testNock = nock('http://test.fr/');

  testNock
    .get('/spa')
    .reply(200, spa);

  testNock
    .get('/dashboard')
    .reply(200, dashBoardInfo);
});
//#endregion

describe('hal-rest-client tests', () => {
  test('Fetch specific class after fetching a generic HalResource', () => {

    const client = createClient('http://test.fr/');
    return client
      .fetch('/spa', HalResource)
      .then((spa: HalResource) => {
        return client
          .fetch('/dashboard', DashboardInfo)
          .then((dashboardInfo: DashboardInfo) => {
            expect(dashboardInfo).toBeInstanceOf(DashboardInfo);
            expect(dashboardInfo.name).toBe<string>('test');
            spa.link('dashboardInfos').prop('name', 'updated');
            expect(dashboardInfo.name).toBe<string>('updated');
          });
      });
  });
});