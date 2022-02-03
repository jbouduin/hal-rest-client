
import * as nock from 'nock';
import { cache, createClient, createResource, HalProperty, HalResource } from '..';
import { IEmbeddedCollection } from './data/common-definitions';
import { DataFactory } from './data/data-factory';
import { UriBuilder } from './data/uri-builder';
import { Cyclical } from './models';

//#region local model definition ----------------------------------------------
class TestModel extends HalResource {
  @HalProperty()
  public id: number;

  @HalProperty()
  public name: string;

  @HalProperty({ name: 'jsonProperty' })
  public typeScriptProperty: string;
}
//#endregion

//#region setup/teardown ------------------------------------------------------
afterAll(() => nock.restore());

afterEach(() => {
  cache.reset();
});
//#endregion

describe('@HalProperty', () => {
  const uriBuilder = new UriBuilder;
  const dataFactory = new DataFactory(uriBuilder);
  const baseUri  = uriBuilder.orgBaseURI;

  test('Json/HAL property to Typescript property', () => {
    const scope = nock(baseUri);
    const data: IEmbeddedCollection = {
      name: 'name', jsonProperty: 'value'
    };
    const test = dataFactory.createResourceData('org', 'test', 1, data)
    scope
      .get(test.relativeUri)
      .reply(200, test.data);
    return createClient(baseUri)
      .fetch(test.relativeUri, TestModel)
      .then((result: TestModel) => {
        expect(result.name).toBe<string>('name');
        expect(result.typeScriptProperty).toBe<string>('value');
        scope.done();
      });
  });

  test('Json/HAL property to Typescript property after update', () => {
    const scope = nock(baseUri);
    const data: IEmbeddedCollection = {
      name: 'name', jsonProperty: 'value'
    };
    const test = dataFactory.createResourceData('org', 'test', 1, data)
    scope
      .get(test.relativeUri)
      .reply(200, test.data);
    scope
      .intercept(test.relativeUri, 'PATCH', { name: 'noname', jsonProperty: 'novalue' })
      .reply(200);
    const client = createClient(baseUri);
    return client
      .fetch(test.relativeUri, TestModel)
      .then((result: TestModel) => {
        result.name = 'noname';
        result.typeScriptProperty = 'novalue';
        return result
          .update()
          .then((response: any) => {
            expect(response.status).toBe<number>(200);
            scope.done();
          });
      });
  });

  test('Typescript property to JSon/HAL property (assign model properties)', () => {
    const scope = nock(baseUri);
    const relativeUri = uriBuilder.resourceUri('org', true, 'test', 1);
    scope
      .intercept(relativeUri, 'POST', { name: 'name', jsonProperty: 'value' })
      .reply(200);
    const resource = createResource(createClient(baseUri), TestModel, relativeUri);
    resource.name = 'name';
    resource.typeScriptProperty = 'value';
    return resource.create()
      .then((result: any) => {
        expect(result.status).toBe<number>(200);
        scope.done();
      });
  });

  test('Typescript property to JSon/HAL property (use "prop" function)', () => {
    const scope = nock(baseUri);
    const relativeUri = uriBuilder.resourceUri('org', true, 'test', 1);
    scope
      .intercept(relativeUri, 'POST', { name: 'name', jsonProperty: 'value' })
      .reply(200);
    const resource = createResource(createClient(baseUri), TestModel, relativeUri);
    resource.prop('name', 'name');
    resource.prop('typeScriptProperty', 'value');
    return resource.create()
      .then((result: any) => {
        expect(result.status).toBe<number>(200);
        scope.done();
      });
  });

  test('@HalProperty must have type for array', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class Test extends HalResource {
        @HalProperty()
        public test: Array<Cyclical>;
      }
    }).toThrowError(/Test\.test for Array you need to specify a resource type on @HalProperty/)
  });

  test('@HalProperty must have type for array', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class Test extends HalResource {
        @HalProperty({name: 'name'})
        public test: Array<Cyclical>;
      }
    }).toThrowError(/Test\.test for Array you need to specify a resource type on @HalProperty/)
  });


});