import * as nock from 'nock';
import { createClient, createResource, cache, HalResource, IHalResource } from '..';
import { Contacts } from './models/contacts';
import { DashboardInfo, Location, Person, SimpleModel } from './models';
import { ProjectFactory } from './data/project-factory';
import { UriBuilder } from './data/uri-builder';
import { PersonFactory } from './data/person-factory';
import { SimpleFactory } from './data/simple-factory';

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

describe('hal-resource fetching', () => {
  const uriBuilder = new UriBuilder;
  const projectFactory = new ProjectFactory('org', uriBuilder);

  test('fetch contains list', () => {
    const projectList = projectFactory.createProjectList(0);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(projectList.relativeUri)
      .reply(200, projectList.data);

    return createClient()
      .fetch(projectList.absoluteUri, HalResource)
      .then((value: HalResource) => {
        expect(value.uri.resourceUri).toBe<string>(projectList.absoluteUri);
        expect(value.getProp('results')).toHaveLength(2);
        expect(value.getProp('results')[0].getProp('name')).toBe<string>('Project 0');
        expect(value.getProp('results')[0]).toBeInstanceOf(HalResource);
        expect(typeof value.getProp('results')[0].fetch).toBe<string>('function');
        expect(value.getProp('results')[0].uri.href)
          .toBe<string>(uriBuilder.resourceUri('org', false, projectFactory.projectsPath, 0));
        expect(value.getProp('results')[1].getProp('name')).toBe<string>('Project 10');
        expect(typeof value.getProp('results')[0].fetch).toBe<string>('function');
        expect(value.getProp('results')[1].uri.href)
          .toBe<string>(uriBuilder.resourceUri('org', false, projectFactory.projectsPath, 10));
      });
  });

  test('resource fetch does not reload if already fetched', () => {
    const project = projectFactory.createProject(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .once()
      .reply(200, project.data);

    return createClient()
      .fetch(project.absoluteUri, HalResource)
      .then((fetched: HalResource) => {
        fetched.setProp('name', 'modified');
        expect(fetched.getProp('name')).toBe<string>('modified');
        return fetched
          .fetch()
          .then((refetched) => {
            expect(refetched.getProp('name')).toBe<string>('modified');
            scope.done();
          });
      });
  });

  test('force resource fetch although already loaded', () => {
    const project = projectFactory.createProject(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .twice()
      .reply(200, project.data);

    return createClient()
      .fetch(project.absoluteUri, HalResource)
      .then((fetched: HalResource) => {
        fetched.setProp('name', 'modified');
        expect(fetched.getProp('name')).toBe<string>('modified');
        return fetched
          .fetch(true)
          .then((refetched: HalResource) => {
            expect(refetched.getProp('name')).toBe<string>('Project 1');
            scope.done();
          });
      });
  });

  test('reload using client overwrites changes', () => {
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
        fetched.setProp('name', 'modified');
        expect(fetched.getProp('name')).toBe<string>('modified');
        return client
          .fetch(project.absoluteUri, HalResource)
          .then((refetched) => {
            expect(refetched.getProp('name')).toBe<string>('Project 1');
            expect(fetched.getProp('name')).toBe<string>('Project 1');
            scope.done();
          });
      });
  });

  test('create Resource by absolute URL and fetch it', () => {
    const simpleFactory = new SimpleFactory(uriBuilder);
    const simple = simpleFactory.createSimpleData();
    const resource = createResource(createClient(uriBuilder.orgBaseURI), HalResource, simple.absoluteUri);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(simple.relativeUri)
      .reply(200, simple.data);

    let cacheKeys = cache.getKeys('Resource');
    expect(cacheKeys).toHaveLength(1);
    expect(cacheKeys[0]).toBe<string>(simple.absoluteUri);
    expect(resource.getProp('name')).toBeUndefined();
    return resource
      .fetch()
      .then(() => {
        expect(resource.getProp('name')).toBe<string>(simple.savedName);
        cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(simple.absoluteUri);
        scope.done();
      });
  });

  test('create Resource by absolute URL and fetch it', () => {
    const simpleFactory = new SimpleFactory(uriBuilder);
    const simple = simpleFactory.createSimpleData();
    const resource = createResource(createClient(uriBuilder.orgBaseURI), HalResource, simple.relativeUri);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(simple.relativeUri)
      .reply(200, simple.data);

    let cacheKeys = cache.getKeys('Resource');
    expect(cacheKeys).toHaveLength(1);
    expect(cacheKeys[0]).toBe<string>(simple.absoluteUri);
    expect(resource.getProp('name')).toBeUndefined();
    return resource
      .fetch()
      .then(() => {
        expect(resource.getProp('name')).toBe<string>(simple.savedName);
        cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(simple.absoluteUri);
        scope.done();
      });
  });

  test('access embedded hal-resource', () => {
    const project = projectFactory.createProject(1);
    const embedded = projectFactory.createResourceData('org', 'test', 1, { name: 'Test 1' });
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
        const testResource = project.getProp<IHalResource>('test');
        expect(testResource.getProp('name')).toBe<string>('Test 1');
      });
  });

  test('use baseUrl with trailing slash and load resources with leading slashes', () => {
    const project = projectFactory.createProject(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .reply(200, project.data);

    return createClient(`${uriBuilder.orgBaseURI}/`)
      .fetch(project.relativeUri, HalResource)
      .then((project: HalResource) => {
        expect(project.getProp('name')).toBe<string>('Project 1');
        scope.done();
      });
  });

  test('use baseUrl without trailing slash and load resources with leading slash', () => {
    const project = projectFactory.createProject(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .reply(200, project.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetch(project.relativeUri, HalResource)
      .then((project: HalResource) => {
        expect(project.getProp('name')).toBe<string>('Project 1');
      });
  });

  test('use baseUrl without trailing slash and load resources without leading slash', () => {
    const project = projectFactory.createProject(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(project.relativeUri)
      .reply(200, project.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetch(project.relativeUri.substring(1), HalResource)
      .then((project: HalResource) => {
        expect(project.getProp('name')).toBe<string>('Project 1');
      });
  });

  test('construct hal-resource without URI', () => {
    const resource = createResource(createClient(uriBuilder.orgBaseURI), HalResource);
    expect(resource).toBeDefined();
  });
});

describe('Resource class properties', () => {
  const uriBuilder = new UriBuilder();
  const personFactory = new PersonFactory('org', uriBuilder);

  test('reading properties', () => {
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
        expect(person.name).toBe<string>('me');
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
        expect(person.home.address).toBeUndefined()
        expect(person.work.address).toBeUndefined()
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
            scope.done()
          });
      });
  });

  test('writing properties', () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((person: Person) => {
        expect(person.name).toBe<string>('me');
        person.name = 'test';
        expect(person.name).toBe<string>('test');
        const contacts = createResource(client, Contacts, '/contacInfos/3');
        person.contacts = contacts;
        expect(person.contacts).toBe<Contacts>(contacts);
      });
  });

  test("Access model members that are not HalResources", () => {
    const dashboard = personFactory.createResourceData('org', 'dashboard', undefined, undefined);
    dashboard.data['name'] = 'test';

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(dashboard.relativeUri)
      .reply(200, dashboard.data);

    return createClient(uriBuilder.orgBaseURI)
      .fetch(dashboard.relativeUri, DashboardInfo)
      .then((dashboard: DashboardInfo) => {
        expect(dashboard.getHalRestClientInfo()).toBe<string>(uriBuilder.orgBaseURI);
        scope.done()
      });
  });

});

describe('updating an array of embedded properties', () => {
  const uriBuilder = new UriBuilder();
  const personFactory = new PersonFactory('org', uriBuilder);

  test('Removing 1 entry from an array', () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);

    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .intercept(person.relativeUri, 'PATCH', { 'my-friends': [person.friends[0].absoluteUri] })
      .reply(200);

    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((person: Person) => {
        person.myFriends = [person.myFriends[0]];
        expect(person.getProp('myFriends')).toHaveLength(1);
        return person.update().then(() => scope.done());
      });
  });

  test('clearing an array', () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .intercept(person.relativeUri, 'PATCH', { 'my-friends': [] })
      .reply(200);

    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, Person)
      .then((person: Person) => {
        person.myFriends = [];
        expect(person.getProp('myFriends')).toHaveLength(0);
        return person.update().then(() => scope.done());
      });
  });

  test.todo('Adding 1 entry to an array');

  test.todo('assigning a complete new array');
});

describe('using hal-resource.create method', () => {
  const uriBuilder = new UriBuilder();
  const simpleFactory = new SimpleFactory(uriBuilder);
  const client = createClient(uriBuilder.orgBaseURI);
  const simple = simpleFactory.createSimpleData();

  test('create using relative creation uri', () => {
    const resource = createResource(client, SimpleModel, simple.relativeCreateUri);
    resource.name = simple.sendName;
    let cacheKeys = cache.getKeys('Resource');
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
        cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(simple.absoluteUri);
      });
  });

  test('create using absolute creation uri', () => {
    const resource = createResource(client, SimpleModel, simple.absoluteCreateUri);
    resource.name = simple.sendName;
    let cacheKeys = cache.getKeys('Resource');
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
        cacheKeys = cache.getKeys('Resource');
        expect(cacheKeys).toHaveLength(1);
        expect(cacheKeys[0]).toBe<string>(simple.absoluteUri);
      });
  });
});

describe('updating an array of links', () => {
  test.todo('Removing 1 entry from an array');
  test.todo('clearing an array');
  test.todo('Adding 1 entry to an array');
  test.todo('assigning a complete new array');
})

describe('hasChanges and ClearChanges', () => {
  test.todo('tests on haschanges');
  test.todo('clear changes');
});
