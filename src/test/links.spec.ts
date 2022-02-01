import * as nock from 'nock';
import { createClient, HalResource, cache } from '..';
import { IData, IEmbeddedCollection, IFactoryResult, ILink, ILinkCollection } from './data/common-definitions';
import { DataFactory } from './data/data-factory';
import { ProjectFactory } from './data/project-factory';
import { UriBuilder } from './data/uri-builder';

//#region setup/teardown ------------------------------------------------------
afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe('Array of links of Halresources', () => {
  const uriBuilder = new UriBuilder();
  const contextTld = 'org';
  const projectFactory = new ProjectFactory(contextTld, uriBuilder);

  test('Array of links containing resources', () => {
    const project = projectFactory.createProject(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .reply(200, project.data);

    return createClient()
      .fetch(project.fullUri, HalResource)
      .then((project: HalResource) => {
        const related = project.link('children');
        expect(related).toBeInstanceOf(Array);
        related.forEach((item: any) => expect(item).toBeInstanceOf(HalResource));
        scope.done();
      });
  });

  test('Fetch array of links of Halresources', () => {
    const project = projectFactory.createProject(1);
    const firstChild = projectFactory.createProject(2);

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .reply(200, project.data);
    scope
      .get(firstChild.relativeUri)
      .reply(200, firstChild.data);

    return createClient()
      .fetch(project.fullUri, HalResource)
      .then((project: HalResource) => {
        const related = project.link('children');
        return related[0]
          .fetch()
          .then((fetched: HalResource) => {
            expect(fetched.prop('id')).toBe<number>(2);
            scope.done();
          });
      });
  });
});

describe('following links', () => {
  const uriBuilder = new UriBuilder();
  const contextTld = 'org';
  const projectFactory = new ProjectFactory(contextTld, uriBuilder);

  test('follow link using "link" function of the Halresource', () => {
    const project = projectFactory.createProject(1);
    const parent = projectFactory.createProject(5);

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .reply(200, project.data);
    scope
      .get(parent.relativeUri)
      .reply(200, parent.data);

    return createClient()
      .fetch(project.fullUri, HalResource)
      .then((value: HalResource) => {
        const subResource = value.link('parent');
        expect(subResource.prop('name')).toBeUndefined();
        return subResource
          .fetch()
          .then(() => {
            expect(subResource.prop('name')).toBe<string>('Project 5');
            scope.done();
          });
      });

  });

  test('follow link using "prop" function of the Halresource', () => {
    const project = projectFactory.createProject(1);
    const parent = projectFactory.createProject(5);

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .reply(200, project.data);
    scope
      .get(parent.relativeUri)
      .reply(200, parent.data);

    return createClient()
      .fetch(project.fullUri, HalResource)
      .then((value: HalResource) => {
        const subResource = value.prop('parent');
        expect(subResource.prop('name')).toBeUndefined();
        return subResource
          .fetch()
          .then(() => {
            expect(subResource.prop('name')).toBe<string>('Project 5');
            scope.done();
          });
      });
  });

  test('can read link without href', () => {
    const project = projectFactory.createProject(1);
    const versions = project.data._links['versions'] as string;
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .reply(200, project.data);

    return createClient()
      .fetch(project.fullUri, HalResource)
      .then((project: HalResource) => {
        expect(project.link('versions').uri.fill()).toBe<string>(versions);
      });
  });
});

describe('additional properties on links', () => {
  const uriBuilder = new UriBuilder();
  const dataFactory = new DataFactory(uriBuilder);
  const contextTld = 'org';
  let data: IFactoryResult<IData>;
  let linkedData: IFactoryResult<IData>;

  beforeAll(() => {
    data = dataFactory.createResourceData(contextTld, 'data');
    linkedData = dataFactory.createResourceData(contextTld, 'linkedData');
    linkedData.data['name'] = 'other';
    const linkedDataSelf: ILink = linkedData.data._links['self'] as ILink;
    linkedDataSelf['type'] = 'application/json';
    dataFactory.addLinkToFactoredData(data.data, 'other', linkedDataSelf);
  });

  test('Get additional properties of a non-fetched link', () => {
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(data.relativeUri)
      .reply(200, data.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetchResource(data.relativeUri, HalResource)
      .then((resource: HalResource) => {
        expect(resource.link('other').prop('type')).toBe<string>('application/json');
        scope.done();
      });
  });

  test('can get link prop after fetch done', () => {
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(data.relativeUri)
      .reply(200, data.data);
    scope
      .get(linkedData.relativeUri)
      .reply(200, linkedData.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetchResource(data.relativeUri, HalResource)
      .then((resource: HalResource) => {
        return resource.link('other')
          .fetch()
          .then((link: HalResource) => {
            expect(link.prop('type')).toBe<string>('application/json');
            expect(link.prop('name')).toBe<string>('other');
            scope.done();
          });
      });
  });
});

describe('Resources with no \'self\'', () => {
  const uriBuilder = new UriBuilder();
  const dataFactory = new DataFactory(uriBuilder);
  const contextTld = 'org';
  const otherLink = uriBuilder.resourceUri(contextTld, true, 'other', 1);
  let resourceWithoutSelf: IFactoryResult<IData>;

  beforeAll(() => {
    const data: IEmbeddedCollection = { name: 'test' };
    const links: ILinkCollection = {
      other: {
        href: otherLink
      }
    };
    resourceWithoutSelf = dataFactory.createResourceData(contextTld, 'resource', 1, data, links);
    delete resourceWithoutSelf.data._links.self;
  });

  test('fetch a resource withouth \'self\' link', () => {
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(resourceWithoutSelf.relativeUri)
      .reply(200, resourceWithoutSelf.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetchResource(resourceWithoutSelf.relativeUri, HalResource)
      .then((resource: HalResource) => {
        expect(resource.uri).toBeUndefined();
        expect(resource.prop('id')).toBe<number>(1);
        expect(resource.prop('name')).toBe<string>('test');
        const cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(otherLink);
        scope.done();
      });
  });

  test('forced re-fetch a resource withouth \'self\' link', () => {
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(resourceWithoutSelf.relativeUri)
      .reply(200, resourceWithoutSelf.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetchResource(resourceWithoutSelf.relativeUri, HalResource)
      .then((resource: HalResource) => {
        return resource
          .fetch(true)
          .then((fetched: HalResource) => {
            expect(fetched.uri).toBeUndefined();
            expect(fetched.prop('id')).toBe<number>(1);
            expect(fetched.prop('name')).toBe<string>('test');
            const cacheKeys = cache.getKeys('Resource');
            expect(cacheKeys).toHaveLength(1);
            expect(cacheKeys[0]).toBe<string>(otherLink);
            expect(fetched).toBe(resource);
            scope.done();
          });
      });
  });

  test('fetch entity with self-less subresource', () => {
    const resourceWithSubResourceWithoutSelf = dataFactory.createResourceData(
      contextTld,
      'withsubresource',
      1,
      {
        name: 'parent',
        child: resourceWithoutSelf.data
      }
    );
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(resourceWithSubResourceWithoutSelf.relativeUri)
      .reply(200, resourceWithSubResourceWithoutSelf.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetchResource(resourceWithSubResourceWithoutSelf.relativeUri, HalResource)
      .then((resource: HalResource) => {
        const subResourceWithoutSelf = resource.prop('child');
        expect(subResourceWithoutSelf.uri).toBeUndefined();
        const cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(2);
        expect(cacheKeys).toContain<string>(otherLink);
        expect(cacheKeys).toContain<string>(resourceWithSubResourceWithoutSelf.fullUri);
        scope.done();
      });
  });
});

describe('Templated links', () => {
  const uriBuilder = new UriBuilder();
  const contextTld = 'org';
  const projectFactory = new ProjectFactory(contextTld, uriBuilder);

  // is this HAL compliant anyway ?
  // TODO 1658 Check spec's on templated self links and implement changes
  test('fetch resource with templated self link', () => {
    const projectList = projectFactory.createProjectList(0);
    const templated = projectList.data._links['templated'];
    const templatedUriString = (templated as ILink).href;
    projectList.data._links['self'] = templated;
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(projectList.relativeUri)
      .reply(200, projectList.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetchResource(projectList.relativeUri, HalResource)
      .then((resource: HalResource) => {
        expect(resource.uri.uri).toBe<string>(templatedUriString);
        // next one fails as it returns /projects?offset=0&sort=LastModified&pageSize=20
        // TODO 1658 check what we are supposed to store as fetchedURI and do not cache
        // expect(resource.uri.resourceURI).toBe<string>(templatedUriString);
        expect(resource.prop('results')).toHaveLength(2);
        scope.done();
      });
  });

  test('can fetch resource with self templated link', () => {
    const projectList = projectFactory.createProjectList(0);
    const templated = projectList.data._links['templated'];
    const templatedUriString = (templated as ILink).href;
    projectList.data._links['self'] = templated;
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(projectList.relativeUri)
      .reply(200, projectList.data);

    return createClient()
      .fetchResource(projectList.fullUri, HalResource)
      .then((resource: HalResource) => {
        expect(resource.uri.uri).toBe<string>(templatedUriString);
        // next one fails as it returns /projects?offset=0&sort=LastModified&pageSize=20
        // TODO check what we are supposed to store as fetchedURI
        // expect(resource.uri.resourceURI).toBe<string>(templatedUriString);
        expect(resource.prop('results')).toHaveLength(2);
        scope.done();
        // expect(resource.uri.uri).toBe<string>('http://test.fr/data{?page,size,sort}');
        // expect(resource.uri.resourceURI).toBe<string>('http://test.fr/data{?page,size,sort}');
        // expect(resource.prop('data')).toHaveLength(1);
      });
  });

  test('fetch templated link using parameter', () => {
    const projectList0 = projectFactory.createProjectList(0);
    const projectList1 = projectFactory.createProjectList(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(projectList0.relativeUri)
      .reply(200, projectList0.data);
    scope
      .get(projectList1.relativeUri)
      .reply(200, projectList1.data)
    return createClient(uriBuilder.orgBaseURI)
      .fetchResource(projectList0.fullUri, HalResource)
      .then((resource: HalResource) => {
        const findLink = resource.link('jumpTo');
        expect(findLink.uri.templated).toBe<boolean>(true);
        expect(findLink.uri.resourceURI).toBe<string>('');
        return findLink
          .fetch({ jumpTo: 1 })
          .then((found: HalResource) => {
            expect(found.prop('results')[0].prop('id')).toBe<number>(10);
            expect(found.uri.resourceURI).toBe<string>(projectList1.fullUri);
            scope.done();
          });
      });
  });

  test('fetch with parameter clean templated URI', () => {
    const projectList = projectFactory.createProjectList(0);
    const rootProjectList = projectFactory.createRootProjectList();

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(projectList.relativeUri)
      .reply(200, projectList.data);
    scope
      .get(rootProjectList.relativeUri)
      .reply(200, rootProjectList.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetchResource(projectList.relativeUri, HalResource)
      .then((resource: HalResource) => {
        const findLink = resource.link('templated');
        return findLink
          .fetch()
          .then((found: HalResource) => {
            expect(found.prop('offset')).toBe<number>(0);
            expect(found.prop('pageSize')).toBe<number>(20);
            expect(found.uri.resourceURI).toBe<string>(rootProjectList.fullUri);
            scope.done();
          });
      });
  });

  test('use path parameter', () => {
    const projectList0 = projectFactory.createProjectList(0);
    const projectList1 = projectFactory.createProjectList(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(projectList0.relativeUri)
      .reply(200, projectList0.data);
    scope
      .get(projectList1.relativeUri)
      .reply(200, projectList1.data)
    return createClient(uriBuilder.orgBaseURI)
      .fetchResource(projectList0.fullUri, HalResource)
      .then((resource: HalResource) => {
        return resource
          .link('jumpTo')
          .fetch({ jumpTo: 1 })
          .then((fetched: HalResource) => {
            expect(fetched.prop('results')[0].prop('id')).toBe<number>(10);
            scope.done();
          });
      });
  });

});