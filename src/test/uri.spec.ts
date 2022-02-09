import { UriData } from '..';
import { UriBuilder } from './data/uri-builder';

const uriBuilder = new UriBuilder();

describe('templated URI tests',() => {
  const fill = { page: 1, size: 100, sort: 'id' };
  const testUri = uriBuilder.templatedResourceUri('org', false, 'projects', fill);

  test('test \'fill\' without values', () => {
    const uri = new UriData(testUri, true);
    const filled = uri.fill();
    expect(filled).toBe<string>(uriBuilder.resourceUri('org', false, 'projects'));
  });

  test('test \'fill\' with all parameters', () => {
    const uri = new UriData(testUri, true);
    const filled = uri.fill(fill);
    expect(filled).toBe<string>(uriBuilder.filledTemplatedResourceUri('org', false, 'projects', fill));
  });

  test('test \'fill\' with redundant parameter', () => {
    const uri = new UriData(testUri, true);
    const redundantFill = { page: 1, size: 100, sort: 'id', redundant: 12345 };
    const filled = uri.fill(redundantFill);
    expect(filled).toBe<string>(uriBuilder.filledTemplatedResourceUri('org', false, 'projects', fill));

  });

  test('test \'fill\' with only first parameter', () => {
    const uri = new UriData(testUri, true);
    const onlyFirst = { sort: 'id'}
    const filled = uri.fill(onlyFirst);
    expect(filled).toBe<string>(uriBuilder.filledTemplatedResourceUri('org', false, 'projects', onlyFirst));
  });

  test('test \'fill\' with only last parameter', () => {
    const uri = new UriData(testUri, true);
    const onlyLast = { size: 100 }
    const filled = uri.fill(onlyLast);
    expect(filled).toBe<string>(uriBuilder.filledTemplatedResourceUri('org', false, 'projects', onlyLast));

  });

  test('test \'fill\' with only middle parameter', () => {
    const uri = new UriData(testUri, true);
    const onlyMiddle = { page: 1 }
    const filled = uri.fill(onlyMiddle);
    expect(filled).toBe<string>(uriBuilder.filledTemplatedResourceUri('org', false, 'projects', onlyMiddle));
  });

  test('test \'fill\' with partially filled querystring', () => {
    const partiallyFilled = { page: '{page}', size: 100, sort: 'id' }
    const uriString = uriBuilder.filledTemplatedResourceUri('org', false, 'projects', partiallyFilled);
    const uri = new UriData(uriString, true);
    const filled = uri.fill({ page: 100 });
    const fullFill = { page: 100, size: 100, sort: 'id' }
    expect(filled).toBe<string>(uriBuilder.filledTemplatedResourceUri('org', false, 'projects', fullFill));
  });

  test('test \'fill\' with spread parameters', () => {
    const uriString = uriBuilder.templatedResourceUri('org', false, 'projects/{id}/workpackages', fill);
    const uri = new UriData(uriString, true);
    const filled = uri.fill({ page: 1, size: 100, sort: 'id', id: 12 });
    expect(filled).toBe<string>(uriBuilder.filledTemplatedResourceUri('org', false,  'projects/12/workpackages', fill));
  });
});

describe('usage of fetchedUri', () => {
  const fill = { page: 1, size: 100, sort: 'id' };
  test('resource URI returns fetched URI', () => {
    const uriString = uriBuilder.templatedResourceUri('org', false, 'projects/{id}/workpackages', fill);
    const uri = new UriData(uriString, true);
    const fetchedUri = uriBuilder.filledTemplatedResourceUri('org', false, 'projects/12/workpackages', fill)
    uri.setFetchedUri(fetchedUri);
    expect(uri.resourceURI).toBe<string>(fetchedUri);
  });

  test('resource URI returns empty when fetched URI has not been set', () => {
    const uriString = uriBuilder.templatedResourceUri('org', false, 'projects/{id}/workpackages', fill);
    const uri = new UriData(uriString, true);
    expect(uri.resourceURI).toBe<string>('');
  });
});

describe('non-templated URI tests', () => {
  const testUri = uriBuilder.resourceUri('org', false, 'projects')
  test('set fetched URI of a non templated URI throws exception', () => {
    const uri = new UriData(testUri, false);
    expect(() => uri.setFetchedUri('something')).toThrow();
  });

  test('resourceUri of a non templated URI', () => {
    const uri = new UriData(testUri, false);
    expect(uri.resourceURI).toBe<string>(testUri);
  });

  test('fill on a non templated URI returns uri', () => {
    const fill = { page: 1, size: 100, sort: 'id' };
    const testUri = uriBuilder.templatedResourceUri('org', false, 'projects', fill);
    const uri = new UriData(testUri, false);
    const filled = uri.fill(fill);
    expect(filled).toBe<string>(testUri);
  });
});