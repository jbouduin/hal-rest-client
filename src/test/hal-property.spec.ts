
import { HalProperty, HalResource } from "..";
import { Cyclical } from "./model/cyclical";
import { Person } from "./model/person";

describe('@HalProperty', () => {
  test('bad use of @HalProperty show error', () => {
    expect(() => {
      class Test extends HalResource {
        @HalProperty(Person, Person)
        public test;
      }
    }).toThrowError('Test.test @HalProperty parameters are \'name\' and \'type\', not reverse')
  });


  test('@HalProperty must have type for array', () => {
    expect(() => {
      class Test extends HalResource {
        @HalProperty()
        public test: Cyclical[];
      }
    }).toThrowError(/Test\.test for Array you need to specify a type on @HalProperty/)
  });
});