import * as nock from 'nock';
import { createClient, cache, JSONParserException, HalResource } from '..';
import { UriBuilder } from './data/uri-builder';
import { HalNotification, NotificationConfig } from './models';

//#region setup/teardown ------------------------------------------------------
afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('Handling non-hal data in the root of the resource', () => {
  const uriBuilder = new UriBuilder();
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
    lastNotificationConfig: {
      category: 'Mail',
      email: {
        enabled: false,
        id: 4,
      },
      notificationDescription: 'You\'ve got mail',
      subcategory: 'Received_Mail',
    },
  };

  test('fetch non hal object throws exception', () => {
    expect.assertions(2);
    const scope = nock(uriBuilder.orgBaseURI);
    const uri = uriBuilder.resourceUri('org', true, 'non-hal');
    scope
      .get(uri)
      .reply(200, [{ 'non-hal': true }]);

    return createClient(uriBuilder.orgBaseURI)
      .fetch(uri, HalResource)
      .catch(e => {
        expect(e).toBeInstanceOf(JSONParserException);
        expect((e as JSONParserException).json).toStrictEqual([{ 'non-hal': true }]);
        scope.done()
      });
  });

  test('fetch a resource as Model with non-hal resources in the root', () => {
    const uri = uriBuilder.resourceUri('org', true, 'notification');
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(uri)
      .reply(200, config);

    return createClient(uriBuilder.orgBaseURI)
      .fetch(uri, HalNotification)
      .then((fetched: HalNotification) => {
        // property on the root
        expect(fetched.cellphoneSet).toBe<boolean>(false);
        // first element in the array
        expect(fetched.notificationConfigs).toHaveLength(1);
        expect(fetched.notificationConfigs[0].category).toBe<string>('Login');
        expect(fetched.notificationConfigs[0].subcategory).toBe<string>('Reset_Password');
        expect(fetched.notificationConfigs[0].email.enabled).toBe<boolean>(true);
        expect(fetched.notificationConfigs[0].email.id).toBe<number>(3);
        expect(fetched.notificationConfigs[0]).toBeInstanceOf(NotificationConfig);
        // non-hal-resource on the root
        expect(fetched.lastNotificationConfig.category).toBe<string>('Mail');
        expect(fetched.lastNotificationConfig.subcategory).toBe<string>('Received_Mail');
        expect(fetched.lastNotificationConfig.email.enabled).toBe<boolean>(false);
        expect(fetched.lastNotificationConfig.email.id).toBe<number>(4);
        expect(fetched.lastNotificationConfig).toBeInstanceOf(NotificationConfig);

      })
  });

  test('fetch a resource as HalResource with non-hal resources in the root', () => {
    const uri = uriBuilder.resourceUri('org', true, 'notification');
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(uri)
      .reply(200, config);

    return createClient(uriBuilder.orgBaseURI)
      .fetch(uri, HalResource)
      .then((fetched: HalResource) => {
        // property on the root
        expect(fetched.prop('cellphoneSet')).toBe<boolean>(false);
        // first element in the array
        const theArray = fetched.prop('notificationConfigs');
        expect(theArray).toHaveLength(1);
        const firstElement = theArray[0];
        expect(firstElement['category']).toBe<string>('Login');
        expect(firstElement['subcategory']).toBe<string>('Reset_Password');
        expect(firstElement['email']['enabled']).toBe<boolean>(true);
        expect(firstElement['email']['id']).toBe<number>(3);
        expect(firstElement).not.toBeInstanceOf(HalResource);
        // non-hal-resource on the root
        const singleElement = fetched.prop('lastNotificationConfig');
        expect(singleElement['category']).toBe<string>('Mail');
        expect(singleElement['subcategory']).toBe<string>('Received_Mail');
        expect(singleElement['email']['enabled']).toBe<boolean>(false);
        expect(singleElement['email']['id']).toBe<number>(4);
        expect(singleElement).not.toBeInstanceOf(HalResource);
      })
  });
});