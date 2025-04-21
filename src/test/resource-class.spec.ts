import * as nock from "nock";
import { createClient, createResource, cache, HalResource, IHalResource } from "..";
import { Contacts } from "./models/contacts";
import { DashboardInfo, Location, Person, SimpleModel } from "./models";
import { ProjectFactory } from "./data/project-factory";
import { UriBuilder } from "./data/uri-builder";
import { PersonFactory } from "./data/person-factory";
import { SimpleFactory } from "./data/simple-factory";

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  nock.cleanAll();
  cache.reset();
});

afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe("hal-resource fetching", () => {
  const uriBuilder = new UriBuilder;
  const projectFactory = new ProjectFactory("org", uriBuilder);

  test("fetch contains list", () => {
    const projectList = projectFactory.createProjectList(0);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(projectList.relativeUri)
      .reply(200, projectList.data);

    return createClient()
      .fetch(projectList.absoluteUri, HalResource)
      .then((value: HalResource) => {
        /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        expect(value.uri.resourceUri).toBe<string>(projectList.absoluteUri);
        expect(value.getProperty("results")).toHaveLength(2);
        expect(value.getProperty("results")[0].getProperty("name")).toBe<string>("Project 0");
        expect(value.getProperty("results")[0]).toBeInstanceOf(HalResource);
        expect(typeof value.getProperty("results")[0].fetch).toBe<string>("function");
        expect(value.getProperty("results")[0].uri.href)
          .toBe<string>(uriBuilder.resourceUri("org", false, projectFactory.projectsPath, 0));
        expect(value.getProperty("results")[1].getProperty("name")).toBe<string>("Project 10");
        expect(typeof value.getProperty("results")[0].fetch).toBe<string>("function");
        expect(value.getProperty("results")[1].uri.href)
          .toBe<string>(uriBuilder.resourceUri("org", false, projectFactory.projectsPath, 10));
        /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
      });
  });

  test("resource fetch does not reload if already fetched", () => {
    const project = projectFactory.createProject(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .once()
      .reply(200, project.data);

    return createClient()
      .fetch(project.absoluteUri, HalResource)
      .then((fetched: HalResource) => {
        fetched.setProperty("name", "modified");
        expect(fetched.getProperty("name")).toBe<string>("modified");
        return fetched
          .fetch()
          .then((refetched) => {
            expect(refetched.getProperty("name")).toBe<string>("modified");
            scope.done();
          });
      });
  });

  test("force resource fetch although already loaded", () => {
    const project = projectFactory.createProject(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .twice()
      .reply(200, project.data);

    return createClient()
      .fetch(project.absoluteUri, HalResource)
      .then((fetched: HalResource) => {
        fetched.setProperty("name", "modified");
        expect(fetched.getProperty("name")).toBe<string>("modified");
        return fetched
          .fetch({ force: true })
          .then((refetched: HalResource) => {
            expect(refetched.getProperty("name")).toBe<string>("Project 1");
            scope.done();
          });
      });
  });

  test("reload using client overwrites changes", () => {
    const project = projectFactory.createProject(1);
    const client = createClient();
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .twice()
      .reply(200, project.data);

    return client
      .fetch(project.absoluteUri, HalResource)
      .then((fetched: HalResource) => {
        fetched.setProperty("name", "modified");
        expect(fetched.getProperty("name")).toBe<string>("modified");
        return client
          .fetch(project.absoluteUri, HalResource)
          .then((refetched) => {
            expect(refetched.getProperty("name")).toBe<string>("Project 1");
            expect(fetched.getProperty("name")).toBe<string>("Project 1");
            scope.done();
          });
      });
  });

  test("create Resource by absolute URL and fetch it", () => {
    const simpleFactory = new SimpleFactory(uriBuilder);
    const simple = simpleFactory.createSimpleData();
    const resource = createResource(createClient(uriBuilder.orgBaseURI), HalResource, simple.absoluteUri);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(simple.relativeUri)
      .reply(200, simple.data);

    let cacheKeys = cache.getKeys("Resource");
    expect(cacheKeys).toHaveLength(1);
    expect(cacheKeys[0]).toBe<string>(simple.absoluteUri);
    expect(resource.getProperty("name")).toBeUndefined();
    return resource
      .fetch()
      .then(() => {
        expect(resource.getProperty("name")).toBe<string>(simple.savedName);
        cacheKeys = cache.getKeys("Resource");
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(simple.absoluteUri);
        scope.done();
      });
  });

  test("create Resource by absolute URL and fetch it", () => {
    const simpleFactory = new SimpleFactory(uriBuilder);
    const simple = simpleFactory.createSimpleData();
    const resource = createResource(createClient(uriBuilder.orgBaseURI), HalResource, simple.relativeUri);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(simple.relativeUri)
      .reply(200, simple.data);

    let cacheKeys = cache.getKeys("Resource");
    expect(cacheKeys).toHaveLength(1);
    expect(cacheKeys[0]).toBe<string>(simple.absoluteUri);
    expect(resource.getProperty("name")).toBeUndefined();
    return resource
      .fetch()
      .then(() => {
        expect(resource.getProperty("name")).toBe<string>(simple.savedName);
        cacheKeys = cache.getKeys("Resource");
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(simple.absoluteUri);
        scope.done();
      });
  });

  test("access embedded hal-resource", () => {
    const project = projectFactory.createProject(1);
    const embedded = projectFactory.createResourceData("org", "test", 1, { name: "Test 1" });
    project.data._embedded = {
      test: embedded.data
    };
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .reply(200, project.data);

    return createClient()
      .fetch(project.absoluteUri, HalResource)
      .then((project: HalResource) => {
        const testResource = project.getProperty<IHalResource>("test");
        expect(testResource.getProperty("name")).toBe<string>("Test 1");
      });
  });

  test("use baseUrl with trailing slash and load resources with leading slashes", () => {
    const project = projectFactory.createProject(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .reply(200, project.data);

    return createClient(`${uriBuilder.orgBaseURI}/`)
      .fetch(project.relativeUri, HalResource)
      .then((project: HalResource) => {
        expect(project.getProperty("name")).toBe<string>("Project 1");
        scope.done();
      });
  });

  test("use baseUrl without trailing slash and load resources with leading slash", () => {
    const project = projectFactory.createProject(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .reply(200, project.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetch(project.relativeUri, HalResource)
      .then((project: HalResource) => {
        expect(project.getProperty("name")).toBe<string>("Project 1");
      });
  });

  test("use baseUrl without trailing slash and load resources without leading slash", () => {
    const project = projectFactory.createProject(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .reply(200, project.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetch(project.relativeUri.substring(1), HalResource)
      .then((project: HalResource) => {
        expect(project.getProperty("name")).toBe<string>("Project 1");
      });
  });

  test("construct hal-resource without URI", () => {
    const resource = createResource(createClient(uriBuilder.orgBaseURI), HalResource);
    expect(resource).toBeDefined();
    return resource
      .fetch()
      .then((fetched: HalResource) => {
        expect(fetched).toBeDefined();
        expect(fetched).toBe(resource);
        expect(resource.isLoaded).toBe<boolean>(false);
      });
  });
});

describe("Resource class properties", () => {
  const uriBuilder = new UriBuilder();
  const personFactory = new PersonFactory("org", uriBuilder);

  test("reading properties using a model", () => {
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
      .then((person: Person) => {
        // person
        expect(person.name).toBe<string>("me");
        // best friend
        expect(person.bestFriend).toBeInstanceOf(Person);
        expect(person.bestFriend.name).toBe<string>(personFactory.myBestFriendsName);
        // father
        expect(person.father).toBeInstanceOf(Person);
        expect(person.father.name).toBe<string>(personFactory.myFathersName);
        // mother
        expect(person.mother).toBeInstanceOf(Person);
        expect(person.mother.name).toBe<string>(personFactory.myMothersName);
        // friends
        expect(person.myFriends).toHaveLength(2);
        expect(person.myFriends[0]).toBeInstanceOf(Person);
        expect(person.myFriends[0].name).toBe<string>(personFactory.firstFriendsName);
        expect(person.myFriends[1]).toBeInstanceOf(Person);
        expect(person.myFriends[1].name).toBe<string>(personFactory.secondFriendsName);

        // contacts
        expect(person.contacts.phone).toBeUndefined();
        expect(person.home.address).toBeUndefined();
        expect(person.work.address).toBeUndefined();
        return Promise
          .all([
            person.contacts.fetch(),
            person.home.fetch(),
            person.work.fetch()
          ])
          .then((value: [Contacts, Location, Location]) => {
            expect(person.contacts.phone).toBe<string>(personFactory.phoneNumber);
            expect(value[0]).toBeInstanceOf(Contacts);
            expect(value[0].phone).toBe<string>(personFactory.phoneNumber);
            expect(person.home.address).toBe<string>(personFactory.homeAddress);
            expect(person.work.address).toBe<string>(personFactory.workAddress);
            scope.done();
          });
      });
  });

  test("writing properties using a model", () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((fetched: Person) => {
        expect(fetched.name).toBe<string>("me");
        fetched.name = "test";
        expect(fetched.name).toBe<string>("test");
        const contacts = createResource(client, Contacts, "/contacInfos/3");
        fetched.contacts = contacts;
        expect(fetched.contacts).toBe<Contacts>(contacts);
        expect(fetched.hasChanges).toBe<boolean>(true);
      });
  });

  test("Access model members that are not HalResources", () => {
    const dashboard = personFactory.createResourceData("org", "dashboard", undefined, undefined);
    dashboard.data["name"] = "test";

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(dashboard.relativeUri)
      .reply(200, dashboard.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetch(dashboard.relativeUri, DashboardInfo)
      .then((dashboard: DashboardInfo) => {
        expect(dashboard.getHalRestClientInfo()).toBe<string>(uriBuilder.orgBaseURI);
        scope.done();
      });
  });

  test("propertyKeys", () => {
    const simpleFactory = new SimpleFactory(uriBuilder);
    const simple = simpleFactory.createSimpleData();
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(simple.relativeUri)
      .reply(200, simple.data);

    return client
      .fetch(simple.relativeUri, SimpleModel)
      .then((model: SimpleModel) => {
        const keys = model.propertyKeys;
        expect(keys).toHaveLength(2);
        expect(keys).toContainEqual<string>("id");
        expect(keys).toContainEqual<string>("name");
        scope.done();
      });
  });

  test("linkKeys", () => {
    const simpleFactory = new SimpleFactory(uriBuilder);
    const simple = simpleFactory.createSimpleListData();
    const client = createClient(uriBuilder.orgBaseURI);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(simple.relativeUri)
      .reply(200, simple.data);

    return client
      .fetch(simple.relativeUri, SimpleModel)
      .then((model: SimpleModel) => {
        const keys = model.linkKeys;
        expect(keys).toHaveLength(2);
        expect(keys).toContainEqual<string>("jumpTo");
        expect(keys).toContainEqual<string>("changeSize");
        expect(keys).not.toContainEqual<string>("self");
        scope.done();
      });
  });

  test("reading properties using a Halresource", () => {
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
      .fetch(person.relativeUri, HalResource)
      .then((fetched: HalResource) => {
        // person
        expect(fetched.getProperty("name")).toBe<string>("me");
        // best friend
        expect(fetched.getProperty("best-friend")).toBeInstanceOf(HalResource);
        expect(fetched.getProperty<HalResource>("best-friend").getProperty("name")).toBe<string>(personFactory.myBestFriendsName);
        // father
        expect(fetched.getProperty("father")).toBeInstanceOf(HalResource);
        expect(fetched.getProperty<HalResource>("father").getProperty("name")).toBe<string>(personFactory.myFathersName);
        // mother
        expect(fetched.getProperty("mother")).toBeInstanceOf(HalResource);
        expect(fetched.getProperty<HalResource>("mother").getProperty("name")).toBe<string>(personFactory.myMothersName);
        // friends
        const myFriendsProperty = fetched.getProperty<Array<HalResource>>("my-friends");
        expect(myFriendsProperty).toHaveLength(2);
        expect(myFriendsProperty[0]).toBeInstanceOf(HalResource);
        expect(myFriendsProperty[0].getProperty("name")).toBe<string>(personFactory.firstFriendsName);
        expect(myFriendsProperty[1]).toBeInstanceOf(HalResource);
        expect(myFriendsProperty[1].getProperty("name")).toBe<string>(personFactory.secondFriendsName);

        // contacts
        expect(fetched.getProperty<{ phone: string }>("contacts").phone).toBeUndefined();
        expect(fetched.getProperty<{ address: string }>("home").address).toBeUndefined();
        expect(fetched.getProperty<{ address: string }>("place-of-employment").address).toBeUndefined();
        return Promise
          .all([
            fetched.getProperty<HalResource>("contacts").fetch(),
            fetched.getProperty<HalResource>("home").fetch(),
            fetched.getProperty<HalResource>("place-of-employment").fetch()
          ])
          .then((value: [HalResource, HalResource, HalResource]) => {
            expect(fetched.getProperty<HalResource>("contacts").getProperty("phone")).toBe<string>(personFactory.phoneNumber);
            expect(value[0]).toBeInstanceOf(HalResource);
            expect(value[0].getProperty("phone")).toBe<string>(personFactory.phoneNumber);
            expect(fetched.getProperty<HalResource>("home").getProperty("address")).toBe<string>(personFactory.homeAddress);
            expect(fetched.getProperty<HalResource>("place-of-employment").getProperty("address")).toBe<string>(personFactory.workAddress);
            scope.done();
          });
      });
  });

  test("writing properties using a Halresource", () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, HalResource)
      .then((fetched: HalResource) => {
        expect(fetched.getProperty("name")).toBe<string>("me");
        fetched.setProperty("name", "test");
        expect(fetched.getProperty("name")).toBe<string>("test");
        const contacts = createResource(client, Contacts, "/contacInfos/3");
        fetched.setProperty("contacts", contacts);
        expect(fetched.getProperty("contacts")).toBe<Contacts>(contacts);
        expect(fetched.hasChanges).toBe<boolean>(true);
      });
  });
});

describe("updating an array of embedded properties", () => {
  const uriBuilder = new UriBuilder();
  const personFactory = new PersonFactory("org", uriBuilder);

  test("Removing 1 entry from an array", () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);

    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .intercept(person.relativeUri, "PATCH", { "my-friends": [person.friends[0].absoluteUri] })
      .reply(200);

    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((fetched: Person) => {
        fetched.myFriends = [fetched.myFriends[0]];
        expect(fetched.getProperty("myFriends")).toHaveLength(1);
        expect(fetched.hasChanges).toBe<boolean>(true);
        return fetched.update().then(() => scope.done());
      });
  });

  test("clearing an array", () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .intercept(person.relativeUri, "PATCH", { "my-friends": [] })
      .reply(200);

    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((person: Person) => {
        person.myFriends = [];
        expect(person.getProperty("myFriends")).toHaveLength(0);
        return person.update().then(() => scope.done());
      });
  });

  test("Adding 1 new entry to an array", () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);

    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .intercept(
        person.relativeUri,
        "PATCH",
        { "my-friends": [person.friends[0].absoluteUri, person.friends[1].absoluteUri, person.friends[0].absoluteUri] })
      .reply(200);

    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((fetched: Person) => {
        fetched.myFriends = [fetched.myFriends[0], fetched.myFriends[1], fetched.myFriends[0]];
        expect(fetched.getProperty("myFriends")).toHaveLength(3);
        expect(fetched.hasChanges).toBe<boolean>(true);
        return fetched.update().then(() => scope.done());
      });
  });

  test("assigning a complete new array", () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);

    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .intercept(person.relativeUri, "PATCH", { "my-friends": [person.friends[1].absoluteUri, person.friends[0].absoluteUri] })
      .reply(200);

    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((fetched: Person) => {
        fetched.myFriends = [fetched.myFriends[1], fetched.myFriends[0]];
        expect(fetched.hasChanges).toBe<boolean>(true);
        expect(fetched.getProperty("myFriends")).toHaveLength(2);
        return fetched.update().then(() => scope.done());
      });
  });
});

describe("using hal-resource.create method", () => {
  const uriBuilder = new UriBuilder();
  const simpleFactory = new SimpleFactory(uriBuilder);
  const client = createClient(uriBuilder.orgBaseURI);
  const simple = simpleFactory.createSimpleData();

  test("create using relative creation uri", () => {
    const resource = createResource(client, SimpleModel, simple.relativeCreateUri);
    resource.name = simple.sendName;
    let cacheKeys = cache.getKeys("Resource");
    expect(cacheKeys).toHaveLength(1);
    expect(cacheKeys[0]).toBe<string>(simple.absoluteCreateUri);

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .post(simple.relativeCreateUri, JSON.stringify(simple.createRequest))
      .reply(200, simple.data);

    return resource
      .create(SimpleModel)
      .then((created: SimpleModel) => {
        expect(created.name).toBe<string>(simple.savedName);
        expect(created.id).toBe<number>(simple.id);
        cacheKeys = cache.getKeys("Resource");
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(simple.absoluteUri);
      });
  });

  test("create using absolute creation uri", () => {
    const resource = createResource(client, SimpleModel, simple.absoluteCreateUri);
    resource.name = simple.sendName;
    let cacheKeys = cache.getKeys("Resource");
    expect(cacheKeys).toHaveLength(1);
    expect(cacheKeys[0]).toBe<string>(simple.absoluteCreateUri);

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .post(simple.relativeCreateUri, JSON.stringify(simple.createRequest))
      .reply(200, simple.data);

    return resource
      .create(SimpleModel)
      .then((created: SimpleModel) => {
        expect(created.name).toBe<string>(simple.savedName);
        expect(created.id).toBe<number>(simple.id);
        cacheKeys = cache.getKeys("Resource");
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(simple.absoluteUri);
      });
  });
});

describe("updating an array of links", () => {
  const uriBuilder = new UriBuilder();
  const personFactory = new PersonFactory("org", uriBuilder);

  test("Removing 1 entry from an array", () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .intercept(person.relativeUri, "PATCH", { colleagues: [person.colleagues[0]] })
      .reply(200);

    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((fetched: Person) => {
        fetched.colleagues = [fetched.colleagues[0]];
        expect(fetched.getLink<Array<IHalResource>>("colleagues")).toHaveLength(1);
        return fetched.update().then(() => scope.done());
      });
  });

  test("clearing an array", () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .intercept(person.relativeUri, "PATCH", { colleagues: [] })
      .reply(200);

    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((person: Person) => {
        person.colleagues = [];
        expect(person.getLink<Array<IHalResource>>("colleagues")).toHaveLength(0);
        return person.update().then(() => scope.done());
      });
  });

  test("Adding 1 new entry to an array", () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .intercept(
        person.relativeUri,
        "PATCH",
        { colleagues: [person.colleagues[0], person.colleagues[1], person.colleagues[0]] })
      .reply(200);

    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((fetched: Person) => {
        fetched.colleagues = [fetched.colleagues[0], fetched.colleagues[1], fetched.colleagues[0]];
        expect(fetched.getLink<Array<IHalResource>>("colleagues")).toHaveLength(3);
        return fetched.update().then(() => scope.done());
      });
  });

  test("assigning a complete new array", () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .intercept(person.relativeUri, "PATCH", { colleagues: [person.colleagues[1], person.colleagues[0]] })
      .reply(200);

    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((fetched: Person) => {
        fetched.colleagues = [fetched.colleagues[1], fetched.colleagues[0]];
        expect(fetched.getLink<Array<IHalResource>>("colleagues")).toHaveLength(2);
        return fetched.update().then(() => scope.done());
      });
  });
});

describe("hasChanges and ClearChanges", () => {
  const uriBuilder = new UriBuilder();
  const personFactory = new PersonFactory("org", uriBuilder);

  test("haschanges", () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((fetched: Person) => {
        fetched.colleagues = [fetched.colleagues[1], fetched.colleagues[0]];
        expect(fetched.hasChanges).toBe<boolean>(true);
        scope.done();
      });
  });

  test("clear changes", () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((fetched: Person) => {
        fetched.colleagues = [fetched.colleagues[1], fetched.colleagues[0]];
        fetched.clearChanges();
        expect(fetched.hasChanges).toBe<boolean>(false);
        scope.done();
      });
  });

  test("hasChanges after updating request", () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .intercept(person.relativeUri, "PATCH", { colleagues: [person.colleagues[1], person.colleagues[0]] })
      .reply(200);

    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((fetched: Person) => {
        fetched.colleagues = [fetched.colleagues[1], fetched.colleagues[0]];
        return fetched
          .update()
          .then(() => {
            expect(fetched.hasChanges).toBe<boolean>(false);
            scope.done();
          });
      });
  });
});
