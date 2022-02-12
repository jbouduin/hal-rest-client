import * as nock from 'nock';
import { createClient, cache, JSONParserException, HalResource } from '..';
import { lookFor, NotificationFactory } from './data/notification-factory';
import { UriBuilder } from './data/uri-builder';
import { HalNotification, NotificationConfig, NotificationEmail } from './models';

//#region setup/teardown ------------------------------------------------------
afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('Handling non-hal data', () => {
  const uriBuilder = new UriBuilder();
  const notificationFactory = new NotificationFactory('org', uriBuilder, 'notifcation-config');

  const checkModel = (config: NotificationConfig, which: lookFor) => {
    expect(config.category).toBe<string>(notificationFactory.categoryValues[which]);
    expect(config.email.enabled).toBe<boolean>(notificationFactory.emailEnabledValues[which]);
    expect(config.email.id).toBe<number>(notificationFactory.emailIdValues[which]);
    expect(config.subcategory).toBe<string>(notificationFactory.subCategoryValues[which]);
    expect(config.notificationDescription).toBe<string>(notificationFactory.descriptionValues[which]);
  }

  const checkHalresource = (config: HalResource, which: lookFor) => {
    expect(config.getProperty('category')).toBe<string>(notificationFactory.categoryValues[which]);
    expect(config.getProperty('subcategory')).toBe<string>(notificationFactory.subCategoryValues[which]);
    expect(config.getProperty('notificationDescription')).toBe<string>(notificationFactory.descriptionValues[which]);
    const email = config.getProperty<NotificationEmail>('email');
    expect(email).not.toBeInstanceOf(HalResource);
    expect(email.enabled).toBe<boolean>(notificationFactory.emailEnabledValues[which]);
    expect(email.id).toBe<number>(notificationFactory.emailIdValues[which]);
  }

  const checkObject = (config: any, which: lookFor) => {
    expect(config.category).toBe<string>(notificationFactory.categoryValues[which]);
    expect(config.subcategory).toBe<string>(notificationFactory.subCategoryValues[which]);
    expect(config.notificationDescription).toBe<string>(notificationFactory.descriptionValues[which]);
    const email = config.email;
    expect(email).not.toBeInstanceOf(HalResource);
    expect(email.enabled).toBe<boolean>(notificationFactory.emailEnabledValues[which]);
    expect(email.id).toBe<number>(notificationFactory.emailIdValues[which]);
  }

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

  test('fetch as model: non-embedded non-hal object is instance of his class', () => {
    const notification = notificationFactory.createNotification();
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(notification.relativeUri)
      .reply(200, notification.data);

    return client
      .fetch(notification.relativeUri, HalNotification)
      .then((result: HalNotification) => {
        expect(result.cellphoneSet).toBe<boolean>(false);
        const toCheck = result.nonEmbeddedObject;
        expect(toCheck).toBeInstanceOf(NotificationConfig);
        checkModel(toCheck, 'nonEmbeddedObject');
      });
  });

  test('fetch as model: embedded non-hal is instance of his class', () => {
    const notification = notificationFactory.createNotification();
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(notification.relativeUri)
      .reply(200, notification.data);

    return client
      .fetch(notification.relativeUri, HalNotification)
      .then((result: HalNotification) => {
        expect(result.cellphoneSet).toBe<boolean>(false);
        const toCheck = result.embeddedObject;
        checkModel(toCheck, 'embeddedObject');
        expect(toCheck).toBeInstanceOf(NotificationConfig);
      });
  });

  test('fetch as model: non-embedded array of non-hal objects contains instance of the class', () => {
    const notification = notificationFactory.createNotification();
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(notification.relativeUri)
      .reply(200, notification.data);

    return client
      .fetch(notification.relativeUri, HalNotification)
      .then((result: HalNotification) => {
        expect(result.cellphoneSet).toBe<boolean>(false);
        const array = result.nonEmbeddedArray;
        expect(array).toHaveLength(1);
        const toCheck = array[0];
        expect(toCheck).toBeInstanceOf(NotificationConfig);
        checkModel(toCheck, 'nonEmbeddedArray');
      });
  });

  test('fetch as model: embedded array of non-hal objects contains instance of the class', () => {
    const notification = notificationFactory.createNotification();
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(notification.relativeUri)
      .reply(200, notification.data);

    return client
      .fetch(notification.relativeUri, HalNotification)
      .then((result: HalNotification) => {
        expect(result.cellphoneSet).toBe<boolean>(false);
        const array = result.embeddedArray;
        expect(array).toHaveLength(1);
        const toCheck = array[0];
        expect(toCheck).toBeInstanceOf(NotificationConfig);
        checkModel(toCheck, 'embeddedArray');
      });
  });

  test('fetch as hal-resource: non-embedded non-hal object is NOT a hal-resource', () => {
    const notification = notificationFactory.createNotification();
    const client = createClient(uriBuilder.orgBaseURI);

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(notification.relativeUri)
      .reply(200, notification.data);

    return client
      .fetch(notification.relativeUri, HalResource)
      .then((result: HalResource) => {
        const toCheck = result.getProperty(notificationFactory.nonEmbeddedObject);
        expect(toCheck).not.toBeInstanceOf(HalResource);
        checkObject(toCheck, 'nonEmbeddedObject');
      });

  });

  test('fetch as hal-resource: embedded non-hal is instance of hal-resource', () => {
    const notification = notificationFactory.createNotification();
    const client = createClient(uriBuilder.orgBaseURI);

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(notification.relativeUri)
      .reply(200, notification.data);

    return client
      .fetch(notification.relativeUri, HalResource)
      .then((result: HalResource) => {
        const toCheck = result.getProperty(notificationFactory.embeddedObject);
        expect(toCheck).toBeInstanceOf(HalResource);
        if (toCheck instanceof HalResource) {
          checkHalresource(toCheck, 'embeddedObject');
        }
      });

  });

  test('fetch as hal-resource: non-embedded array of non-hal objects contains no hal-resource instances', () => {
    const notification = notificationFactory.createNotification();
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(notification.relativeUri)
      .reply(200, notification.data);

    return client
      .fetch(notification.relativeUri, HalResource)
      .then((result: HalResource) => {
        const array = result.getProperty(notificationFactory.nonEmbeddedArray);
        expect(array).toHaveLength(1);
        const toCheck = array[0];
        expect(toCheck).not.toBeInstanceOf(HalResource);
        checkObject(toCheck, 'nonEmbeddedArray');
      });

  });

  test('fetch as hal-resource: embedded array of non-hal objects contains hal-resources', () => {
    const notification = notificationFactory.createNotification();
    const client = createClient(uriBuilder.orgBaseURI);

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(notification.relativeUri)
      .reply(200, notification.data);

    return client
      .fetch(notification.relativeUri, HalResource)
      .then((result: HalResource) => {
        const array = result.getProperty(notificationFactory.embeddedArray);
        expect(array).toHaveLength(1);
        const toCheck = array[0];
        expect(toCheck).toBeInstanceOf(HalResource);
        if (toCheck instanceof HalResource) {
          checkHalresource(toCheck, 'embeddedArray');
        }
      });

  });

});