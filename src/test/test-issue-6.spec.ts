import * as nock from 'nock';
import { createClient, HalProperty, HalResource, resetCache } from '..';

class DashboardInfo extends HalResource {
  @HalProperty()
  public name: string;
}

// mock list response
beforeAll(() => {
  nock.cleanAll();
  resetCache();

  const json = {
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
    .reply(200, json);

  testNock
    .get('/dashboard')
    .reply(200, dashBoardInfo);
});

test('can fetch specific class after fetch HalResource', () => {

  const client = createClient('http://test.fr/');
  return client
    .fetch('/spa', HalResource)
    .then((spa: HalResource) => {
      return client
        .fetch('/dashboard', DashboardInfo)
        .then((dashboard: DashboardInfo) => {
          expect(dashboard).toBeInstanceOf(DashboardInfo);
          expect(dashboard.name).toBe<string>('test');
          spa.link('dashboardInfos').prop('name', 'updated');
          expect(dashboard.name).toBe<string>('updated');
        });
    });
});
