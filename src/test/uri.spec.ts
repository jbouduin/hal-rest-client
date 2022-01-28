import { URI } from '..';
import { UriBuilder } from './data/uri-builder';

describe('templated URI tests',() => {
  const fill = { page: 1, size: 100, sort: 'id' };
  const testUri = UriBuilder.templatedResourceUri('projects', fill);

  test('test \'fill\' without values', () => {
    const uri = new URI(testUri, true);
    const filled = uri.fill();
    expect(filled).toBe<string>(UriBuilder.resourceUri('projects'));
  });

  test('test \'fill\' with all parameters', () => {
    const uri = new URI(testUri, true);
    const filled = uri.fill(fill);
    expect(filled).toBe<string>(UriBuilder.filledTemplatedResourceUri('projects', fill));
  });

  test('test \'fill\' with redundant parameter', () => {
    const uri = new URI(testUri, true);
    const redundantFill = { page: 1, size: 100, sort: 'id', redundant: 12345 };
    const filled = uri.fill(redundantFill);
    expect(filled).toBe<string>(UriBuilder.filledTemplatedResourceUri('projects', fill));

  });

  test('test \'fill\' with only first parameter', () => {
    const uri = new URI(testUri, true);
    const onlyFirst = { sort: 'id'}
    const filled = uri.fill(onlyFirst);
    expect(filled).toBe<string>(UriBuilder.filledTemplatedResourceUri('projects', onlyFirst));
  });

  test('test \'fill\' with only last parameter', () => {
    const uri = new URI(testUri, true);
    const onlyLast = { size: 100 }
    const filled = uri.fill(onlyLast);
    expect(filled).toBe<string>(UriBuilder.filledTemplatedResourceUri('projects', onlyLast));

  });

  test('test \'fill\' with only middle parameter', () => {
    const uri = new URI(testUri, true);
    const onlyMiddle = { page: 1 }
    const filled = uri.fill(onlyMiddle);
    expect(filled).toBe<string>(UriBuilder.filledTemplatedResourceUri('projects', onlyMiddle));
  });

  test('test \'fill\' with spread parameters', () => {
    const uriString = UriBuilder.templatedResourceUri('projects/{id}/workpackages', fill);
    const uri = new URI(uriString, true);
    const filled = uri.fill({ page: 1, size: 100, sort: 'id', id: 12 });
    expect(filled).toBe<string>(UriBuilder.filledTemplatedResourceUri('projects/12/workpackages', fill));
  });

  test('resource URI returns fetched URI', () => {
    const uriString = UriBuilder.templatedResourceUri('projects/{id}/workpackages', fill);
    const uri = new URI(uriString, true);
    const fetchedUri = UriBuilder.filledTemplatedResourceUri('projects/12/workpackages', fill)
    uri.setFetchedUri(fetchedUri);
    expect(uri.resourceURI).toBe<string>(fetchedUri);
  });

  test('resource URI returns empty when fetched URI has not been set', () => {
    const uriString = UriBuilder.templatedResourceUri('projects/{id}/workpackages', fill);
    const uri = new URI(uriString, true);
    expect(uri.resourceURI).toBe<string>('');
  });
});

describe('non-templated URI tests', () => {
  const testUri = UriBuilder.resourceUri('projects')
  test('set fetched URI of a non templated URI throws exception', () => {
    const uri = new URI(testUri, false);
    expect(() => uri.setFetchedUri('something')).toThrow();
  });

  test('resourceUri of a non templated URI', () => {
    const uri = new URI(testUri, false);
    expect(uri.resourceURI).toBe<string>(testUri);
  });

  test('fill on a non templated URI returns uri', () => {
    const fill = { page: 1, size: 100, sort: 'id' };
    const testUri = UriBuilder.templatedResourceUri('projects', fill);
    const uri = new URI(testUri, false);
    const filled = uri.fill(fill);
    expect(filled).toBe<string>(testUri);
  });
});