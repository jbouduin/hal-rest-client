import { readFileSync } from "fs";
import { UriTemplate } from "..";

interface UriTestSuite {
  level: number,
  variables: Record<string, string>;
  testcases: Array<[string, string | Array<string>]>;
}

interface NegativeTestSuite {
  level: number,
  variables: Record<string, string>;
  testcases: Array<[string, boolean]>;
}

describe.each([
  ["https://www.test.org/root/{alfa}/{beta}/{alfa}/{hello}", "https://www.test.org/root/first/second/first/Hello%20World%21"],
  ["https://www.test.org/root/{alfa}/{beta}/xyz/{hello}", "https://www.test.org/root/first/second/xyz/Hello%20World%21"],
  ["https://www.test.org/root/{alfa}/{beta}/{hello}/xyz", "https://www.test.org/root/first/second/Hello%20World%21/xyz"],
  ["https://www.test.org/root{?alfa,beta,hello}", "https://www.test.org/root?alfa=first&beta=second&hello=Hello%20World%21"]
])("Initial tests not 100% covered by official tests", (template: string, result: string) => {
  const data = { alfa: "first", beta: "second", emptyArray: [], hello: "Hello World!" };

  test(`${template} => ${result}`, () => {
    const uriTemplate = new UriTemplate(template);
    expect(uriTemplate).toBeDefined();
    const filled = uriTemplate.fill(data);
    expect(filled).toBe<string>(result);
  });
});

let tests = JSON.parse(readFileSync("uritemplate-test/spec-examples.json", "utf-8")) as Record<string, UriTestSuite>;
const suites1: Array<[string, UriTestSuite]> = Object.keys(tests).map((key: string) => [key, tests[key]]);
tests = JSON.parse(readFileSync("uritemplate-test/spec-examples-by-section.json", "utf-8")) as Record<string, UriTestSuite>;
const suites2: Array<[string, UriTestSuite]> = Object.keys(tests).map((key: string) => [key, tests[key]]);
tests = JSON.parse(readFileSync("uritemplate-test/extended-tests.json", "utf-8")) as Record<string, UriTestSuite>;
const suites3: Array<[string, UriTestSuite]> = Object.keys(tests).map((key: string) => [key, tests[key]]);
describe.each(suites1.concat(suites2).concat(suites3))("Spec examples: %s", (_key: string, suite: UriTestSuite) => {
  suite.testcases
    .forEach((testCase: [string, string]) => {
      test(`${testCase[0]} => ${testCase[1]}`, () => {
        const uriTemplate = new UriTemplate(testCase[0]);
        expect(uriTemplate).toBeDefined();
        expect(uriTemplate.inErrorState).toBe<boolean>(false);
        const filled = uriTemplate.fill(suite.variables);
        // expect(filled.length).toBeGreaterThan(0);
        if (Array.isArray(testCase[1])) {
          expect(testCase[1]).toContain(filled);
        } else {
          expect(filled).toBe<string>(testCase[1]);
        }
      });
    });
});

const negativeTests = JSON.parse(readFileSync("uritemplate-test/negative-tests.json", "utf-8")) as Record<string, NegativeTestSuite>;
const negativeSuites: Array<[string, NegativeTestSuite]> = Object.keys(negativeTests).map((key: string) => [key, negativeTests[key]]);
describe.each(negativeSuites)("Spec examples: %s", (_key: string, suite: NegativeTestSuite) => {
  suite.testcases
    .forEach((testCase: [string, boolean]) => {
      test(`${testCase[0]}`, () => {
        const uriTemplate = new UriTemplate(testCase[0]);
        expect(uriTemplate).toBeDefined();
        // next expect is not possible, as there are some cases where parsing runs fine, but filling not
        // expect(uriTemplate.inErrorState).toBe<boolean>(true);
        const filled = uriTemplate.fill(suite.variables);
        expect(filled).toBeUndefined();
      });
    });
});
