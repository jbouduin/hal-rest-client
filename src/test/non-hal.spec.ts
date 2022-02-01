import * as nock from 'nock';
import { createClient, cache, JSONParserException, HalResource } from '..';
import { UriBuilder } from './data/uri-builder';
import { HalNotification } from './models';

//#region setup/teardown ------------------------------------------------------
afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('Handling non-hal data', () => {
  const uriBuilder = new UriBuilder();

  test('fetch non hal object throws exception', () => {
    expect.assertions(2);
    const scope = nock(uriBuilder.orgBaseURI);
    const uri = uriBuilder.resourceUri('org', true, 'non-hal');
    scope
      .get(uri)
      .reply(200, [{ 'non-hal': true }]);

    return createClient(uriBuilder.orgBaseURI)
      .fetchResource(uri, HalResource)
      .catch ( e => {
        expect(e).toBeInstanceOf(JSONParserException);
        expect((e as JSONParserException).json).toStrictEqual([{ 'non-hal': true }]);
        scope.done()
      });
  });

  test('fetch a resource with a property which is an array of non hal resource', () => {
    const config = {
      _links: {
        self: {
          href: 'http://test.fr/notificationConfig',
          type: 'application/hal+json',
        },
        updateNotificationConfigs: {
          href: 'http://test.fr/notificationConfig/update',
          type: 'application/hal+json',
        },
      },
      cellphoneSet: false,
      notificationConfigs: [
        {
          category: 'Login',
          email: {
            enabled: true,
            id: 3,
          },
          notificationDescription: 'Your password has been reset',
          subcategory: 'Reset_Password',
        },
      ],
    };

    const uri = uriBuilder.resourceUri('org', true, 'notification');
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(uri)
      .reply(200, config);

    return createClient(uriBuilder.orgBaseURI)
      .fetch(uri, HalNotification)
      .then((fetched: HalNotification) => {
        expect(fetched.cellphoneSet).toBe<boolean>(false);
        expect(fetched.notificationConfigs).toHaveLength(1);
        expect(fetched.notificationConfigs[0].subcategory).toBe<string>('Reset_Password');
        expect(fetched.notificationConfigs[0].email.id).toBe<number>(3);
      })
  });
});