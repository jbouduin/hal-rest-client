import { cache, URI } from '..';
import * as nock from 'nock';

const testUri = 'http://test.fr/data{?page,size,sort}';
beforeAll(() => {
  cache.reset();
  nock.cleanAll();
});

describe('templated URI tests',() => {
  test('test fill without values', () => {
    const uri = new URI(testUri, true);
    const filled = uri.fill();
    expect(filled).toBe<string>('http://test.fr/data');
  });

  test('test fill with all parameters', () => {
    const uri = new URI(testUri, true);
    const filled = uri.fill({page: 1, size: 100, sort: 'id'});
    expect(filled).toBe<string>('http://test.fr/data?page=1&size=100&sort=id');
  });

  test('test fill with non-used parameter', () => {
    const uri = new URI(testUri, true);
    const filled = uri.fill({ page: 1, size: 100, sort: 'id', none: 12345 });
    expect(filled).toBe<string>('http://test.fr/data?page=1&size=100&sort=id');
  });

  test('test fill with only first parameter', () => {
    const uri = new URI(testUri, true);
    const filled = uri.fill({ page: 1});
    expect(filled).toBe<string>('http://test.fr/data?page=1');
  });

  test('test fill with only last parameter', () => {
    const uri = new URI(testUri, true);
    const filled = uri.fill({ sort: 'id' });
    expect(filled).toBe<string>('http://test.fr/data?sort=id');
  });

  test('test fill with only middle parameter', () => {
    const uri = new URI(testUri, true);
    const filled = uri.fill({ size: 100 });
    expect(filled).toBe<string>('http://test.fr/data?size=100');
  });

  test('fill a templated URI with separated parameters', () => {
    const uri = new URI('http://test.fr/projects/{id}/workpackages{?page,size,sort}', true);
    const filled = uri.fill({ page: 1, size: 100, sort: 'id', id: 12 });
    expect(filled).toBe<string>('http://test.fr/projects/12/workpackages?page=1&size=100&sort=id');
  });

  test('resource URI returns fetched URI', () => {
    const uri = new URI('http://test.fr/projects/{id}/workpackages{?page,size,sort}', true);
    uri.setFetchedUri('http://test.fr/projects/12/workpackages?page=1&size=100&sort=id');
    expect(uri.resourceURI).toBe<string>('http://test.fr/projects/12/workpackages?page=1&size=100&sort=id');
  });
});

describe('non-templated URI tests', () => {
  test('set fetched URI of a non templated URI throws exception', () => {
    const uri = new URI('some/uri', false);
    expect(() => uri.setFetchedUri('something')).toThrow();
  });

  test('resourceUri of a non templated URI', () => {
    const uri = new URI('some/uri', false);
    expect(uri.resourceURI).toBe<string>('some/uri');
  });

  test('fill on a non templated URI returns uri', () => {
    const testUri = 'some/uri{?page,size,sort}';
    const uri = new URI(testUri, false);
    const filled = uri.fill({ page: 1, size: 100, sort: 'id' });
    expect(filled).toBe<string>(testUri);
  });
});