
import * as nock from 'nock';
import { createClient, createResource, HalResource, resetCache } from '..';
import { URI } from '..';

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  resetCache();
  const project1 = {
    _embedded: {
      test: {
        _links: {
          self: {
            href: 'http://test.fr/test/1',
          },
        },
        name: 'test 1',
      },
    },
    _links: {
      project: {
        href: 'http://test.fr/projects/1',
      },
      self: {
        href: 'http://test.fr/projects/1',
      }
    },
    name: 'Project 1',
    prop2: undefined,
    prop3: undefined,
  };



  const scope = nock('http://test.fr/').persist();

  scope
    .get('/projects')
    .reply(200, {
      _embedded: {
        projects: [JSON.parse(JSON.stringify(project1)), {
          _links: {
            customer: {
              href: 'http://test.fr/projects/2/customer',
            },
            project: {
              href: 'http://test.fr/projects/2',
            },
            self: {
              href: 'http://test.fr/projects/2',
            },
            versions: {
              href: 'http://test.fr/projects/2/versions',
            },
          },
          name: 'Project 2',
        }],
      },
      _links: {
        profile: {
          href: 'http://test.fr/profile/projects',
        },
        self: {
          href: 'http://test.fr/projects',
        },
      },
      page: {
        number: 0,
        size: 20,
        totalElements: 2,
        totalPages: 1,
      },
    });

  project1.prop2 = { key: 'value' };
  project1.prop3 = 'value3';

  scope
    .get('/projects/1')
    .reply(200, project1);

  const project3 = {
    _links: {
      self: 'http://test.fr/projects/3',
      subResource: {
        href: 'http://test.fr/projects/3/subResource',
      },
      versions: 'http://test.fr/projects/3/versions',
    },
    name: 'Project 3',
  };
  scope
    .get('/project/3')
    .reply(200, project3);
});

afterAll(() => nock.restore());
afterEach(() => {
  resetCache();
});
//#endregion

describe('hal-resource tests', () => {

  test('fetch contains list', () => {
    return createClient()
      .fetch('http://test.fr/projects', HalResource)
      .then((value: HalResource) => {
        expect(value.uri.fill({})).toBe<string>('http://test.fr/projects');
        expect(value.prop('projects')).toHaveLength(2);
        expect(value.prop('projects')[0].prop('name')).toBe<string>('Project 1');
        expect(value.prop('projects')[0].uri.fill()).toBe<string>('http://test.fr/projects/1');
        expect(value.prop('projects')[1].prop('name')).toBe<string>('Project 2');
        expect(value.prop('projects')[1].uri.fill()).toBe<string>('http://test.fr/projects/2');
      });
  });

  test('fetched list item are resources', () => {
    return createClient()
      .fetch('http://test.fr/projects', HalResource)
      .then((value: HalResource) => {
        const project = value.prop('projects')[0];
        expect(typeof project.fetch).toBe<string>('function');
      });
  });

  test('resource fetch don\'t reload if already fetched', () => {
    return createClient()
      .fetch('http://test.fr/projects', HalResource)
      .then((value: HalResource) => {
        const project = value.prop('projects')[0];
        expect(project.prop('prop2')).toBeUndefined();
        return project
          .fetch()
          .then(() => {
            expect(project.prop('prop2')).toBeUndefined();
          });
      });
  });

  test('resource fetch can be forced', () => {
    return createClient()
      .fetch('http://test.fr/projects', HalResource)
      .then((value: HalResource) => {
        const project = value.prop('projects')[0];
        expect(project.prop('prop2')).toBeUndefined();
        return project
          .fetch(true)
          .then(() => {
            expect(project.prop('prop3')).toBe<string>('value3');
            expect(project.prop('prop2')).toStrictEqual<{ [key: string]: string }>({ key: 'value' });
          });
      });
  });

  test('create Resource by URL and fetch it', () => {
    const project = new HalResource(createClient(), new URI('http://test.fr/projects/1'));
    expect(project.prop('name')).toBeUndefined();
    return project
      .fetch()
      .then(() => {
        expect(project.prop('name')).toBe<string>('Project 1');
      });
  });

  test('access embedded hal-resource', () => {
    return createClient()
      .fetch('http://test.fr/projects/1', HalResource)
      .then((project: HalResource) => {
        const testResource = project.prop('test');
        expect(testResource.prop('name')).toBe<string>('test 1');
      });
  });

  test('can use baseUrl to load resources with double slashes', () => {
    return createClient('http://test.fr/')
      .fetch('/projects/1', HalResource)
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('Project 1');
      });
  });

  test('can use baseUrl to load resources one slash', () => {
    return createClient('http://test.fr')
      .fetch('/projects/1', HalResource)
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('Project 1');
      });
  });

  test('use interceptor', () => {
    const client = createClient('http://test.fr/');
    client.interceptors.request.use((config) => {
      config.url += '/1';
      return config;
    });
    return client
      .fetchResource('/projects')
      .then((project: HalResource) => {
        expect(project.prop('name')).toBe<string>('Project 1');
      });
  });

  test('construct hal-resource with URI', () => {
    const resource = createResource(createClient('http://test.fr'), HalResource);
    expect(resource).toBeDefined();
  });
});
