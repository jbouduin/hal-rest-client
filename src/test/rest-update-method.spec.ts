import { createClient, HalResource, cache, IHalResource } from "..";
import * as nock from "nock";
import { UriBuilder } from "./data/uri-builder";
import { PersonFactory } from "./data/person-factory";
import { HostTld } from "./data/common-definitions";
import { SimpleModel } from "./models";

//#region setup/teardown ------------------------------------------------------
beforeAll(() => {
  cache.reset();
  nock.cleanAll();
});

afterAll(() => nock.restore());
afterEach(() => {
  cache.reset();
});
//#endregion

describe("Rest update calls", () => {
  const uriBuilder = new UriBuilder();
  const personFactory = new PersonFactory("org", uriBuilder);

  test("update person using HalResource", async () => {
    const person1 = personFactory.createPerson(1);
    const person2 = personFactory.createPerson(99);
    const client = createClient();

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person1.relativeUri)
      .reply(200, person1.data)
      .get(person2.relativeUri)
      .reply(200, person2.data)
      .intercept(person1.relativeUri, "PATCH", { name: "test", "best-friend": person2.absoluteUri })
      .reply(200);

    return Promise
      .all([
        client.fetch(person1.absoluteUri, HalResource),
        client.fetch(person2.absoluteUri, HalResource)
      ])
      .then((resources: [HalResource, HalResource]) => {
        resources[0].setProperty("name", "test");
        resources[0].setProperty("best-friend", resources[1]);
        return resources[0]
          .update()
          .then((result: Record<string, unknown>) => {
            expect(result.status).toBe<number>(200);
            expect(resources[0].hasChanges).toBe<boolean>(false);
            scope.done();
          });
      });
  });

  test("update link using HalResource", () => {
    const person = personFactory.createPerson(1);
    const newName = "test";
    const newPhone = "06XX1245XX";

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .get(person.contacts.relativeUri)
      .reply(200, person.contacts.data);
    scope
      .intercept(person.relativeUri, "PATCH", { name: newName })
      .reply(200);
    scope
      .intercept(person.contacts.relativeUri, "PATCH", { phone: newPhone })
      .reply(200);

    const client = createClient();
    return client
      .fetch(person.absoluteUri, HalResource)
      .then((resource: HalResource) => {
        return resource.getProperty<IHalResource>("contacts")
          .fetch()
          .then(() => resource);
      })
      .then((resource: HalResource) => {
        resource.setProperty("name", newName);
        resource.getProperty<IHalResource>("contacts").setProperty("phone", newPhone);

        return Promise
          .all([
            resource.update(),
            resource.getProperty<IHalResource>("contacts").update()
          ])
          .then((result: [Record<string, unknown>, Record<string, unknown>]) => {
            expect(result[0].status).toBe<number>(200);
            expect(result[1].status).toBe<number>(200);
            scope.done();
          });
      });
  });

  test("update new link of a HalResource", () => {
    const person = personFactory.createPerson(1);
    const newName = "test";
    delete person.data._links.contacts;

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .get(person.contacts.relativeUri)
      .reply(200, person.contacts.data);
    scope
      .intercept(person.relativeUri, "PATCH",{ name: newName, contacts: person.contacts.absoluteUri } )
      .reply(200);

    const client = createClient(uriBuilder.orgBaseURI);
    return Promise
      .all([
        client.fetch(person.relativeUri, HalResource),
        client.fetch(person.contacts.relativeUri, HalResource)
      ])
      .then((resources: [HalResource, HalResource]) => {
        resources[0].setProperty("name", newName);
        resources[0].setProperty("contacts", resources[1]);
        return resources[0].update()
          .then((result: Record<string, unknown>) => {
            expect(result.status).toBe<number>(200);
            scope.done();
          });
      });
  });

  test("update prop and link to undefined", () => {
    const person = personFactory.createPerson(1);
    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person.relativeUri)
      .reply(200, person.data);
    scope
      .intercept(person.relativeUri, "PATCH", { name: undefined, home: undefined })
      .reply(200);

    const client = createClient(uriBuilder.orgBaseURI);
    return client
      .fetch(person.relativeUri, HalResource)
      .then((resource: HalResource) => {
        resource.setProperty("name", null);
        resource.setProperty("home", null);
        return resource.update()
          .then((result: Record<string, unknown>) => {
            expect(result.status).toBe<number>(200);
            scope.done();
          });
      });
  });

  test("update with custom serializer", () => {
    const person1 = personFactory.createPerson(1);
    const person2 = personFactory.createPerson(99);
    const prefix = "ownSerializer.";
    const newName = "test";

    const scope = nock(uriBuilder.orgBaseURI);
    scope
      .get(person1.relativeUri)
      .reply(200, person1.data)
      .get(person2.relativeUri)
      .reply(200, person2.data)
      .intercept(person1.relativeUri, "PATCH", { name: `${prefix}${newName}`, "best-friend": `${prefix}${person2.absoluteUri}` })
      .reply(200);

    const client = createClient(uriBuilder.orgBaseURI);
    return Promise
      .all([
        client.fetch(person1.relativeUri, HalResource),
        client.fetch(person2.relativeUri, HalResource)
      ])
      .then((result: [HalResource, HalResource]) => {
        result[0].setProperty("name", newName);
        result[0].setProperty("best-friend", result[1]);

        return result[0]
          .update(undefined, {
            parseProp: (value: string) => `${prefix}${value}`,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            parseResource: (value: IHalResource) => `${prefix}${value["_uri"].href}`,
          })
          .then((result2: Record<string, unknown>) => {
            expect(result2.status).toBe<number>(200);
            scope.done();
          });
      });
  });

  test("call update (PATCH) with hal-client", () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const fullUri = uriBuilder.resourceUri("org", false, "test", 1);
    const relativeUri = uriBuilder.resourceUri("org", true, "test", 1);

    const scope = nock(uriBuilder.orgBaseURI)
      .intercept(relativeUri, "PATCH", { name: "test" })
      .reply(200);

    return client
      .update(fullUri, { name: "test" })
      .then((result: Record<string, unknown>) => {
        expect(result.status).toBe<number>(200);
        scope.done();
      });
  });

  test("call full update (PUT) using hal-rest-client", () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const fullUri = uriBuilder.resourceUri("org", false, "test", 1);
    const relativeUri = uriBuilder.resourceUri("org", true, "test", 1);

    const scope = nock(uriBuilder.orgBaseURI)
      .intercept(relativeUri, "PUT", { name: "test" })
      .reply(200);

    return client
      .update(fullUri, { name: "test" }, true)
      .then((result: Record<string, unknown>) => {
        expect(result.status).toBe<number>(200);
        scope.done();
      });
  });
});

describe("Different return values of calling update", () => {
  const contextTld: HostTld = "org";
  const uriBuilder = new UriBuilder();
  const newName = "Fanny";
  const id = 69;
  const personUri = uriBuilder.resourceUri(contextTld, false, "persons", id);
  const updateRequest = { name: newName };
  const resourceResponse = {
    id: id,
    name: newName,
    _links: {
      self: { href: personUri }
    }
  };
  const jsonResponse = { status: "OK" };

  test("call update and receive status back", () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const fullUri = uriBuilder.resourceUri("org", false, "test", 1);
    const relativeUri = uriBuilder.resourceUri("org", true, "test", 1);

    const scope = nock(uriBuilder.orgBaseURI)
      .intercept(relativeUri, "PUT", updateRequest)
      .reply(200);

    return client
      .update(fullUri, updateRequest, true)
      .then((result: Record<string, unknown>) => {
        expect(result.status).toBe<number>(200);
        scope.done();
      });
  });

  test("call update and receive a JSON back", () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const fullUri = uriBuilder.resourceUri("org", false, "test", 1);
    const relativeUri = uriBuilder.resourceUri("org", true, "test", 1);

    const scope = nock(uriBuilder.orgBaseURI)
      .intercept(relativeUri, "PUT", updateRequest)
      .reply(200, jsonResponse);

    return client
      .update(fullUri, updateRequest, true)
      .then((result: Record<string, unknown>) => {
        expect(result.status).toBe<string>("OK");
        scope.done();
      });
  });

  test("call update and receive a model back", () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const fullUri = uriBuilder.resourceUri("org", false, "test", 1);
    const relativeUri = uriBuilder.resourceUri("org", true, "test", 1);

    const scope = nock(uriBuilder.orgBaseURI)
      .intercept(relativeUri, "PUT", updateRequest)
      .reply(200, resourceResponse);

    return client
      .update(fullUri, updateRequest, true, SimpleModel)
      .then((result: SimpleModel) => {
        expect(result.name).toBe<string>(newName);
        scope.done();
      });
  });

  test("call update an receive a HalResource back", () => {
    const client = createClient(uriBuilder.orgBaseURI);
    const fullUri = uriBuilder.resourceUri("org", false, "test", 1);
    const relativeUri = uriBuilder.resourceUri("org", true, "test", 1);

    const scope = nock(uriBuilder.orgBaseURI)
      .intercept(relativeUri, "PUT", updateRequest)
      .reply(200, resourceResponse);

    return client
      .update(fullUri, updateRequest, true, HalResource)
      .then((result: HalResource) => {
        expect(result.getProperty("name")).toBe<string>(newName);
        scope.done();
      });
  });
});
