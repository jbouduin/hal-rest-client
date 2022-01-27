import * as nock from 'nock';
import { createClient, HalResource, cache } from '..';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  cache.reset();
  const project1 = {
    _links: {
      related: [
        { href: 'http://test.fr/projects/1' },
        { href: 'http://test.fr/projects/2' },
        { href: 'http://test.fr/projects/3' },
      ],
      self: {
        href: 'http://test.fr/projects/1'
      },
      subResource: {
        href: 'http://test.fr/projects/1/subResource',
      },
      versions: 'http://test.fr/projects/1/versions',
    },
    test: 'test',
  };

  const project2 = {
    _links: {
      self: {
        href: 'http://test.fr/projects/2',
      },
    },
  };

  const project3 = {
    _links: {
      self: {
        href: 'http://test.fr/projects/3',
      },
    },
  };

  const subResource = {
    _links: {
      self: {
        href: 'http://test.fr/projects/1',
      },
    },
    prop1: 'value 1',
  };

  const scope = nock('http://test.fr/').persist();

  scope
    .get('/projects/1')
    .reply(200, project1);

  scope
    .get('/projects/2')
    .reply(200, project2);

  scope
    .get('/projects/3')
    .reply(200, project3);

  scope
    .get('/projects/1/subResource')
    .reply(200, subResource);
});

afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('Issue32: Array of links of Halresources', () => {
  test('Issue32: array of links contains resources', () => {
    return createClient()
      .fetch('http://test.fr/projects/1', HalResource)
      .then((project: HalResource) => {
        const related = project.link('related');
        expect(related).toBeInstanceOf(Array);
        related.forEach((item) => expect(item).toBeInstanceOf(HalResource));
      });
  });

  test('Issue32: fetch array of links of Halresources', () => {
    return createClient()
      .fetch('http://test.fr/projects/1', HalResource)
      .then((project: HalResource) => {
        const related = project.link('related');
        return related[0]
          .fetch()
          .then((fetched: HalResource) => {
            expect(fetched.prop('test')).toBe<string>('test');
          });
      });
  });

  test('follow link using "link" function of the Halresource', () => {
    return createClient()
      .fetch('http://test.fr/projects/1', HalResource)
      .then((value: HalResource) => {
        const subResource = value.link('subResource');
        expect(subResource.prop('prop1')).toBeUndefined();
        return subResource
          .fetch()
          .then(() => {
            expect(subResource.prop('prop1')).toBe<string>('value 1');
          });
      });

  });

  test('follow link using "prop" function of the Halresource', () => {
    return createClient().fetch('http://test.fr/projects/1', HalResource)
      .then((value: HalResource) => {
        const subResource = value.prop('subResource');
        expect(subResource.prop('prop1')).toBeUndefined();
        return subResource
          .fetch()
          .then(() => {
            expect(subResource.prop('prop1')).toBe<string>('value 1');
          });
      });
  });

  test('can read link without href', () => {
    return createClient('http://test.fr')
      .fetchResource('/projects/1')
      .then((project: HalResource) => {
        expect(project.uri.fill({})).toBe<string>('http://test.fr/projects/1');
        expect(project.prop('subResource').uri.fill()).toBe<string>('http://test.fr/projects/1/subResource');
        expect(project.link('versions').uri.fill()).toBe<string>('http://test.fr/projects/1/versions');
      });
  });
});