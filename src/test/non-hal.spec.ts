import * as nock from 'nock';
import { createClient, cache } from '..';
import { HalNotification } from './models';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  const scope = nock('http://test.fr/').persist();

  const json = {
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

  scope
    .get('/project/non-hal')
    .reply(200, { 'non-hal': true });
  scope
    .get('/notificationConfigs')
    .reply(200, json);
});

afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('Handling non-hal data', () => {
  test('fetch non hal object throw exception', () => {
    expect.assertions(1);
    return createClient('http://test.fr/')
      .fetchResource('/project/non-hal')
      .catch(e => {
        expect(e.message.startsWith('object is not hal resource')).toBe<boolean>(true);
      });
  });

  test('can fetch array of non hal resource', () => {
    return createClient('http://test.fr/')
      .fetch('/notificationConfigs', HalNotification)
      .then((fetched: HalNotification) => {
        expect(fetched.cellphoneSet).toBe<boolean>(false);
        expect(fetched.notificationConfigs).toHaveLength(1);
        expect(fetched.notificationConfigs[0].subcategory).toBe<string>('Reset_Password');
        expect(fetched.notificationConfigs[0].email.id).toBe<number>(3);
      })
  });
});