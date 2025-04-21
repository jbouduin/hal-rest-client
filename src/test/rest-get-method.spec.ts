import * as nock from "nock";
import { createClient, HalResource, cache, IHalResource } from "..";
import { IFactoryResult, IData, ILinkCollection, HostTld } from "./data/common-definitions";
import { DataFactory } from "./data/data-factory";
import { PersonFactory } from "./data/person-factory";
import { UriBuilder } from "./data/uri-builder";
import { Contacts, DashboardInfo, Person } from "./models";

//#region setup/teardown ------------------------------------------------------
afterEach(() => {
  cache.reset();
});
//#endregion

describe("fetch resources", () => {
  let uriBuilder: UriBuilder;
  let dataFactory: DataFactory;
  let linkKey: string;
  let spa: IFactoryResult<IData>;
  let dashboard: IFactoryResult<IData>;
  let contextTld: HostTld;

  beforeAll(() => {
    cache.reset();
    nock.cleanAll();
    uriBuilder = new UriBuilder();
    dataFactory = new DataFactory(uriBuilder);
    linkKey = "dashboardInfos";
    contextTld = "org";
    const spaLinks: ILinkCollection = {};
    spaLinks[linkKey] = {
      href: uriBuilder.resourceUri(contextTld, false, "dashboard"),
      type: "application/hal+json",
    };

    spa = dataFactory.createResourceData(contextTld, "spa", undefined, undefined, spaLinks);
    spa.data._links.self["type"] = "application/hal+json";
    dashboard = dataFactory.createResourceData(contextTld, "dashboard", undefined, undefined);
    dashboard.data["name"] = "test";
  });

  test("create client with uri and fetch resource with full uri", () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(dashboard.relativeUri)
      .reply(200, dashboard.data);

    return client
      .fetch(dashboard.absoluteUri, DashboardInfo)
      .then((dashboardInfo: DashboardInfo) => {
        expect(dashboardInfo).toBeInstanceOf(DashboardInfo);
        expect(dashboardInfo.name).toBe<string>("test");
        scope.done();
      });
  });

  test("create client with uri and fetch resource with relative uri", () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(dashboard.relativeUri)
      .reply(200, dashboard.data);

    return client
      .fetch(dashboard.relativeUri, DashboardInfo)
      .then((dashboardInfo: DashboardInfo) => {
        expect(dashboardInfo).toBeInstanceOf(DashboardInfo);
        expect(dashboardInfo.name).toBe<string>("test");
        scope.done();
      });
  });

  test("create client on org and fetch a resource from com", () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const dashboardOnCom = dataFactory.createResourceData("com", "dashboard", undefined, undefined);
    dashboardOnCom.data["name"] = "test";

    const scope = nock(uriBuilder.comBaseURI);
    scope
      .get(dashboardOnCom.relativeUri)
      .reply(200, dashboardOnCom.data);

    return client
      .fetch(dashboardOnCom.absoluteUri, DashboardInfo)
      .then((dashboardInfo: DashboardInfo) => {
        expect(dashboardInfo).toBeInstanceOf(DashboardInfo);
        expect(dashboardInfo.name).toBe<string>("test");
        expect(dashboardInfo.uri.resourceUri).toBe<string>(dashboardOnCom.absoluteUri);
        scope.done();
      });
  });

  test("Fetch specific class after fetching a generic HalResource", () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(spa.relativeUri)
      .reply(200, spa.data);
    scope
      .get(dashboard.relativeUri)
      .reply(200, dashboard.data);

    return client
      .fetch(spa.relativeUri, HalResource)
      .then((spa: HalResource) => {
        return client
          .fetch(dashboard.absoluteUri, DashboardInfo)
          .then((dashboardInfo: DashboardInfo) => {
            expect(dashboardInfo).toBeInstanceOf(DashboardInfo);
            expect(dashboardInfo.name).toBe<string>("test");
            spa.getLink<IHalResource>(linkKey).setProperty("name", "updated");
            expect(dashboardInfo.name).toBe<string>("updated");
            scope.done();
          });
      });
  });
});

// TODO 1660 Remove non compliant feature of retrieving an array of HAL-resources
describe("fetch arrays", () => {
  let uriBuilder: UriBuilder;
  let personFactory: PersonFactory;
  let contextTld: HostTld;

  beforeAll(() => {
    cache.reset();
    nock.cleanAll();
    contextTld = "org";
    uriBuilder = new UriBuilder();
    personFactory = new PersonFactory(contextTld, uriBuilder);
  });

  test("fetch embedded Array of Persons", () => {
    const person = personFactory.createPerson(1);
    const persons = new Array<IData>();
    persons.push(person.data);

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get("/persons")
      .reply(200,
        {
          _embedded: { persons: [person.data] },
          _links: { self: { href: uriBuilder.resourceUri(contextTld, false, "persons") } },
        });

    return createClient(uriBuilder.orgBaseURI)
      .fetchArray("/persons", Person)
      .then((persons: Array<Person>) => {
        expect(persons).toHaveLength(1);
        expect(persons[0]).toBeInstanceOf(Person);
        expect(persons[0].name).toBe<string>("me");
        scope.done();
      });
  });

  test("first property in _embedded is not an array throws exception", () => {
    expect.assertions(1);
    const resource = personFactory.createResourceData(contextTld, "persons", 1, { name: "name" });
    resource.data._embedded = {};
    personFactory.AddEmbeddedPerson(resource.data._embedded, "non-array", 2, "non-array");

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(resource.relativeUri)
      .reply(200, resource.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetchArray(resource.relativeUri, HalResource)
      .catch((e: Error) => {
        expect(e.message).toBe<string>("property _embedded.non-array is not an array");
        scope.done();
      });
  });

  test("hal-resource with wrong format throws exception", () => {
    expect.assertions(1);
    const resource = personFactory.createContacts(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(resource.relativeUri)
      .reply(200, resource.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetchArray(resource.relativeUri, Contacts)
      .catch((e: Error) => {
        expect(e.message).toBe<string>("Unparsable array: it's neither an array nor an halResource");
        scope.done();
      });
  });

  test("empty _embedded throws exception", () => {
    expect.assertions(1);
    const resource = personFactory.createContacts(1);
    resource.data._embedded = {};

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(resource.relativeUri)
      .reply(200, resource.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetchArray(resource.relativeUri, Contacts)
      .catch((e: Error) => {
        expect(e.message).toBe<string>("property _embedded does not contain an array");
        scope.done();
      });
  });

  test("fetch Array of Hal-Resources", () => {
    const person = personFactory.createPerson(1);
    const persons = new Array<IData>();
    const endpoint = uriBuilder.resourceUri(contextTld, true, "persons");
    persons.push(person.data);

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(endpoint)
      .reply(200, [
        person.data,
        {
          _links: {
            self: {
              href: uriBuilder.resourceUri(contextTld, false, "persons", 2),
            },
          },
          name: null,
        }
      ]);

    return createClient(uriBuilder.orgBaseURI)
      .fetchArray(endpoint, Person)
      .then((persons: Array<Person>) => {
        expect(persons).toHaveLength(2);
        expect(persons[0]).toBeInstanceOf(Person);
        expect(persons[0].name).toBe<string>("me");
        expect(persons[1].name).toBeNull();
        scope.done();
      });
  });
});
