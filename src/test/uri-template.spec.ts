import { readFileSync } from "fs";
import { UriTemplate } from ".."


interface UriTestSuite {
  level: number,
  variables: Record<string, string>;
  testcases: Array<[string, string | Array<string>]>;
}

describe('Initial tests not covered by official tests', () => {
  test('simple expansion', () => {
    const template = new UriTemplate('https://www.test.org/root/{alfa}/{beta}/{alfa}/{hello}');
    expect(template).toBeDefined();
    const filled = template.fill({ alfa: 'first', beta: 'second', hello: 'Hello World!' });
    expect(filled).toBe<string>('https://www.test.org/root/first/second/first/Hello%20World%21')
  });

  test('query parameters', () => {
    const template = new UriTemplate('https://www.test.org/root{?alfa,beta,hello}');
    expect(template).toBeDefined(); const filled = template.fill({ alfa: 'first', beta: 'second', hello: 'Hello World!' });
    expect(filled).toBe<string>('https://www.test.org/root?alfa=first&beta=second&hello=Hello%20World%21')
  });
});

let tests = JSON.parse(readFileSync('uritemplate-test/spec-examples.json', 'utf-8')) as Record<string, UriTestSuite>;
const suites: Array<[string, UriTestSuite]> = Object.keys(tests).map((key: string) => [key, tests[key]]);
tests = JSON.parse(readFileSync('uritemplate-test/spec-examples-by-section.json', 'utf-8')) as Record<string, UriTestSuite>;
suites.push(...Object.keys(tests).map((key: string) => [key, tests[key]]) as Array<[string, UriTestSuite]>);
describe.each(suites)('Spec examples: %s', (_key: string, suite: UriTestSuite) => {
  // if (
  // _key.includes('Level 1')
  // ||
  // _key.includes('Level 2')
  //  ||
  // _key.includes('Level 3')
  // ||
  // _key.includes('Level 4')
  // )
  suite.testcases
    // .filter((f: [string, string]) =>
    // f[0] === '{;v,bar,who}')
      // f[0].includes('X{.empty_keys*}')
    // )
    .forEach((testCase: [string, string]) => {
      test(`${testCase[0]} => ${testCase[1]}`, () => {
        const uriTemplate = new UriTemplate(testCase[0]);
        expect(uriTemplate).toBeDefined();
        const filled = uriTemplate.fill(suite.variables);
        expect(filled.length).toBeGreaterThan(0);
        if (Array.isArray(testCase[1])) {
          expect(testCase[1]).toContain(filled);
        } else {
          expect(filled).toBe<string>(testCase[1]);
        }
      });
    });
});