
import * as nock from 'nock';
import { createClient, createResource, HalProperty, HalResource } from '..';
import { Cyclical } from './models';

class TestModel extends HalResource {
  @HalProperty()
  public name: string;

  @HalProperty({name: 'jsonProperty'})
  public typeScriptProperty: string;
}

afterAll(() => nock.restore());

describe('@HalProperty', () => {
  test('Json/HAL property to Typescript property', () => {
    const scope = nock('http://test.fr/');
    scope
      .get('/test')
      .reply(200, { _links: { self: '/test' }, name: 'name', jsonProperty: 'value' });
    return createClient('http://test.fr')
      .fetch('/test', TestModel)
      .then((result: TestModel) => {
        expect(result.name).toBe<string>('name');
        expect(result.typeScriptProperty).toBe<string>('value');
        scope.done();
      });
  });

  test('Json/HAL property to Typescript property after update', () => {
    const scope = nock('http://test.fr/');
    scope
      .get('/test')
      .reply(200, { _links: { self: '/test' }, name: 'name', jsonProperty: 'value' });
    scope
      .intercept('/test', 'PATCH', { name: 'noname', jsonProperty: 'novalue' })
      .reply(200);
    const client = createClient('http://test.fr');
    return client
      .fetch('/test', TestModel)
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
    const scope = nock('http://test.fr/');
    scope
      .intercept('/test', 'POST', { name: 'name', jsonProperty: 'value' })
      .reply(200);
    const resource = createResource(createClient('http://test.fr/'), TestModel, '/test');
    resource.name = 'name';
    resource.typeScriptProperty = 'value';
    return resource.create()
      .then((result: any) => {
        expect(result.status).toBe<number>(200);
        scope.done();
      });
  });

  test('Typescript property to JSon/HAL property (use "prop" function)', () => {
    const scope = nock('http://test.fr/');
    scope
      .intercept('/test', 'POST', { name: 'name', jsonProperty: 'value' })
      .reply(200);
    const resource = createResource(createClient('http://test.fr/'), TestModel, '/test');
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