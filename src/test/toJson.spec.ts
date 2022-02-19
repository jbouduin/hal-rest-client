import * as nock from 'nock';
import { cache, createClient, createResource, HalResource, IHalResource } from "..";
import { IQueryParameters, IListData, ILink, ILinkCollection } from "./data/common-definitions";
import { DataFactory } from "./data/data-factory";
import { PersonFactory } from "./data/person-factory";
import { ProjectFactory } from "./data/project-factory";
import { UriBuilder } from "./data/uri-builder";
import { CyclicalList, Person } from "./models";

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  cache.reset();
});

afterEach(() => { cache.reset(); })
afterAll(() => nock.restore());
//#endregion

// these are not real 'tests' but the easiest way to visually check what a JSON looks like
describe('toJSON', () => {
  const uriBuilder = new UriBuilder()
  const dataFactory = new DataFactory(uriBuilder);

  test('JSON.stringify cyclicals', () => {
    const cyclical1 = dataFactory.createResourceData('org', 'cyclicals', 1, { property: 'name' });
    const queryParameters: IQueryParameters = {
      sort: 'id',
      offset: 0,
      pageSize: 20,
    };
    const listData: IListData = {
      queryParameters,
      listKey: 'cyclicals',
      listData: [cyclical1.data]
    };

    const refreshUri = uriBuilder.resourceUri('org', true, 'cyclicals', undefined, 'refresh');
    const refreshLink: ILink = { href: refreshUri };
    const links: ILinkCollection = { refresh: refreshLink };

    const cyclicals = dataFactory.createResourceListData('org', 'cyclicals', listData, links);
    const baseUri = uriBuilder.orgBaseURI;
    const scope = nock(baseUri);
    scope
      .get(cyclical1.relativeUri)
      .reply(200, cyclicals.data);
    scope
      .get(refreshLink.href)
      .reply(200, cyclicals.data);

    const client = createClient(baseUri);
    return client
      .fetch(cyclical1.relativeUri, CyclicalList)
      .then((cyclicals: CyclicalList) => {
        return cyclicals.refresh
          .fetch()
          .then((level2: CyclicalList) => {
            return level2.refresh
              .fetch()
              .then(() => {
                const asJson = JSON.stringify(cyclicals, null, 2);
                expect(asJson).toBeDefined();
                expect(asJson.length).toBeGreaterThan(0)
                scope.done();
              });
          });
      });
  });

  test('JSON.stringify project', () => {
    const projectFactory = new ProjectFactory('org', uriBuilder);
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
      .fetch(project.absoluteUri, HalResource)
      .then((fetched: HalResource) => {
        const related = fetched.getLink<Array<IHalResource>>('children');
        return related[0]
          .fetch()
          .then(() => {
            const asJson = JSON.stringify(fetched, null, 2);
            expect(asJson).toBeDefined();
            expect(asJson.length).toBeGreaterThan(0)
            scope.done();
          });
      });
  });

  test('JSON stringify person', () => {
    const personFactory = new PersonFactory('org', uriBuilder);
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .get(person.home.relativeUri)
      .reply(200, person.home.data);
    scope
      .get(person.work.relativeUri)
      .reply(200, person.work.data);
    scope
      .get(person.contacts.relativeUri)
      .reply(200, person.contacts.data);

    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((fetched: Person) => {
        return Promise
          .all([
            fetched.contacts.fetch(),
            fetched.home.fetch(),
            fetched.work.fetch()
          ])
          .then(() => {
            const asJson = JSON.stringify(fetched, null, 2);
            expect(asJson).toBeDefined();
            expect(asJson.length).toBeGreaterThan(0);
            scope.done()
          });
      });
  });

  test('JSON stringify a non fetched resource', () => {
    const uri = uriBuilder.orgBaseURI;
    const resource = createResource(createClient(uri), HalResource);
    const asJson = JSON.stringify(resource, null, 2);
    expect(asJson).toBeDefined();
    expect(asJson.length).toBeGreaterThan(0)
  })
});