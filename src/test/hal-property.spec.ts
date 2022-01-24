
import { HalProperty, HalResource } from '..';
import { Cyclical, Person} from './models';

describe('@HalProperty', () => {
  test('bad use of @HalProperty show error', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class Test extends HalResource {
        @HalProperty(Person, Person)
        public test;
      }
    }).toThrowError('Test.test @HalProperty parameters are \'name\' and \'type\', not reverse')
  });


  test('@HalProperty must have type for array', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class Test extends HalResource {
        @HalProperty()
        public test: Array<Cyclical>;
      }
    }).toThrowError(/Test\.test for Array you need to specify a type on @HalProperty/)
  });
});