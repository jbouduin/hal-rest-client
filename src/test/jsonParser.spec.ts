import { IJSONParser, JSONParser } from "../lib/hal-json-parser";
import { createClient, HalResource, IHalResource, JSONParserException } from "..";
import { UriBuilder } from "./data/uri-builder";
import { ToHalResourceModel, ToModelModel } from "./models";

describe("Generic JSON Parser", () => {
  const uriBuilder = new UriBuilder();
  const client = createClient(uriBuilder.orgBaseURI);
  const parser: IJSONParser = new JSONParser();

  test("create HalResource using JSON without _links", () => {
    const json = {
      name: "name"
    };
    const resource = parser.objectToHalResource(client, json, "", HalResource);
    expect(resource).toBeInstanceOf(HalResource);
    expect(resource.getProperty("name")).toBe<string>("name");
  });

  test("create HalResource using JSON without _embedded", () => {
    const json = {
      name: "name"
    };
    const resource = parser.objectToHalResource(client, json, "", HalResource);
    expect(resource).toBeInstanceOf(HalResource);
    expect(resource.getProperty("name")).toBe<string>("name");
  });

  test("create HalResource using empty JSON", () => {
    const json = {};
    const resource = parser.objectToHalResource(client, json, "", HalResource);
    expect(resource).toBeInstanceOf(HalResource);
    expect(Object.keys(resource["props"])).toHaveLength(0);
  });

  test("create HalModel using JSON without _links", () => {
    const json = {
      name: "name"
    };
    const resource = parser.objectToHalResource(client, json, "", ToHalResourceModel);
    expect(resource).toBeInstanceOf(ToHalResourceModel);
  });

  test("create HalModel using JSON without _embedded", () => {
    const json = {
      name: "name"
    };
    const resource = parser.objectToHalResource(client, json, "", ToHalResourceModel);
    expect(resource).toBeInstanceOf(ToHalResourceModel);
    expect(resource.getProperty("name")).toBe<string>("name");
  });

  test("create HalModel using empty JSON", () => {
    const json = {};
    const resource = parser.objectToHalResource(client, json, "", ToHalResourceModel);
    expect(resource).toBeInstanceOf(ToHalResourceModel);
    expect(Object.keys(resource["props"])).toHaveLength(0);
  });
});

describe("JSON Parser: links", () => {
  const uriBuilder = new UriBuilder();
  const client = createClient(uriBuilder.orgBaseURI);
  const parser: IJSONParser = new JSONParser();

  const testHalResource = (resource: HalResource) => {
    const link1 = resource.getLink<IHalResource>("link1");
    expect(link1).toBeInstanceOf(HalResource);
    expect(link1.getProperty("href")).toBe<string>("/link1");
    expect(link1.uri.resourceUri).toBe<string>("/link1");

    const link1b = resource.getProperty<IHalResource>("link1");
    expect(link1b).toBeInstanceOf(HalResource);
    expect(link1b.getProperty("href")).toBe<string>("/link1");
    expect(link1b.uri.resourceUri).toBe<string>("/link1");

    const link2 = resource.getLink<Array<IHalResource>>("link2");
    expect(link2).toHaveLength(2);
    expect(link2[0]).toBeInstanceOf(HalResource);
    expect(link2[0].getProperty("href")).toBe<string>("/link2.1");
    expect(link2[0].uri.resourceUri).toBe<string>("/link2.1");
    expect(link2[1]).toBeInstanceOf(HalResource);
    expect(link2[1].getProperty("href")).toBe<string>("/link2.2");
    expect(link2[1].uri.resourceUri).toBe<string>("/link2.2");

    const link2b = resource.getProperty<Array<IHalResource>>("link2");
    expect(link2b).toHaveLength(2);
    expect(link2b[0]).toBeInstanceOf(HalResource);
    expect(link2b[0].getProperty("href")).toBe<string>("/link2.1");
    expect(link2b[0].uri.resourceUri).toBe<string>("/link2.1");
    expect(link2b[1]).toBeInstanceOf(HalResource);
    expect(link2b[1].getProperty("href")).toBe<string>("/link2.2");
    expect(link2b[1].uri.resourceUri).toBe<string>("/link2.2");
  };

  const testToHalResourceModel = (model: ToHalResourceModel) => {
    testHalResource(model);
    expect(model.link1).toBeInstanceOf(HalResource);
    expect(model.link1.getProperty("href")).toBe<string>("/link1");
    expect(model.link1.uri.resourceUri).toBe<string>("/link1");
    expect(model.link2).toHaveLength(2);
    expect(model.link2[0]).toBeInstanceOf(HalResource);
    expect(model.link2[0].getProperty("href")).toBe<string>("/link2.1");
    expect(model.link2[0].uri.resourceUri).toBe<string>("/link2.1");
    expect(model.link2[1]).toBeInstanceOf(HalResource);
    expect(model.link2[1].getProperty("href")).toBe<string>("/link2.2");
    expect(model.link2[1].uri.resourceUri).toBe<string>("/link2.2");
  };

  const testToModelModel = (model: ToModelModel) => {
    testToHalResourceModel(model);
    expect(model.getLink("link1")).toBeInstanceOf(ToModelModel);
    expect(model.getProperty("link1")).toBeInstanceOf(ToModelModel);
    expect(model.link1).toBeInstanceOf(ToModelModel);

    const link2 = model.getLink("link2");
    expect(link2[0]).toBeInstanceOf(ToModelModel);
    expect(link2[1]).toBeInstanceOf(ToModelModel);
    expect(model.link2[0]).toBeInstanceOf(ToModelModel);
    expect(model.link2[1]).toBeInstanceOf(ToModelModel);
  };

  test("HalResource linking to HalResource - string links", () => {
    const toParse = {
      _links: {
        link1: "/link1",
        link2: [
          "/link2.1",
          "/link2.2"
        ]
      }
    };
    const resource = parser.objectToHalResource(client, toParse, "", HalResource);
    testHalResource(resource);
  });

  test("HalResource linking to HalResource - HAL-spec links", () => {
    const toParse = {
      _links: {
        link1: { href: "/link1" },
        link2: [
          { href: "/link2.1" },
          { href: "/link2.2" }
        ]
      }
    };
    const resource = parser.objectToHalResource(client, toParse, "", HalResource);
    testHalResource(resource);
  });

  test("HalResource linking to HalResource - mixed links", () => {
    const toParse = {
      _links: {
        link1: { href: "/link1" },
        link2: [
          "/link2.1",
          { href: "/link2.2" }
        ],
        link3: "/link3"
      }
    };
    const resource = parser.objectToHalResource(client, toParse, "", HalResource);
    testHalResource(resource);
    expect(resource.getLink<IHalResource>("link3")).toBeInstanceOf(HalResource);
    expect(resource.getLink<IHalResource>("link3").getProperty("href")).toBe<string>("/link3");
  });

  test("HalModel linking to HalResource - string links", () => {
    const toParse = {
      _links: {
        link1: "/link1",
        link2: [
          "/link2.1",
          "/link2.2"
        ]
      }
    };
    const model = parser.objectToHalResource(client, toParse, "", ToHalResourceModel);
    testToHalResourceModel(model);
  });

  test("HalModel linking to HalResource - HAL-spec links", () => {
    const toParse = {
      _links: {
        link1: { href: "/link1" },
        link2: [
          { href: "/link2.1" },
          { href: "/link2.2" }
        ]
      }
    };
    const model = parser.objectToHalResource(client, toParse, "", ToHalResourceModel);
    testToHalResourceModel(model);
  });

  test("Halmodel linking to HalResource - mixed links", () => {
    const toParse = {
      _links: {
        link1: { href: "/link1" },
        link2: [
          "/link2.1",
          { href: "/link2.2" }
        ],
        link3: "/link3"
      }
    };
    const model = parser.objectToHalResource(client, toParse, "", ToHalResourceModel);
    testToHalResourceModel(model);
    expect(model.getLink<IHalResource>("link3")).toBeInstanceOf(HalResource);
    expect(model.getLink<IHalResource>("link3").getProperty("href")).toBe<string>("/link3");
    expect(model.link3).toBeInstanceOf(HalResource);
    expect(model.link3.uri.resourceUri).toBe<string>("/link3");
  });

  test("HalModel linking to HalModel - all links are strings", () => {
    const uriBuilder = new UriBuilder();
    const client = createClient(uriBuilder.orgBaseURI);
    const parser: IJSONParser = new JSONParser();
    const toParse = {
      _links: {
        link1: "/link1",
        link2: [
          "/link2.1",
          "/link2.2"
        ]
      }
    };
    const model = parser.objectToHalResource(client, toParse, "", ToModelModel);
    testToModelModel(model);
  });

  test("HalModel linking to HalModel - HAL-spec links", () => {
    const toParse = {
      _links: {
        link1: { href: "/link1" },
        link2: [
          { href: "/link2.1" },
          { href: "/link2.2" }
        ]
      }
    };
    const model = parser.objectToHalResource(client, toParse, "", ToModelModel);
    testToModelModel(model);
  });

  test("Halmodel linking to Halmodel - mixed links", () => {
    const toParse = {
      _links: {
        link1: { href: "/link1" },
        link2: [
          "/link2.1",
          { href: "/link2.2" }
        ],
        link3: "/link3"
      }
    };
    const model = parser.objectToHalResource(client, toParse, "", ToModelModel);
    testToHalResourceModel(model);
    expect(model.getLink<IHalResource>("link3")).toBeInstanceOf(ToModelModel);
    expect(model.getLink<IHalResource>("link3").getProperty("href")).toBe<string>("/link3");
    expect(model.link3).toBeInstanceOf(ToModelModel);
    expect(model.link3.uri.resourceUri).toBe<string>("/link3");
  });

  test("extended link properties", () => {
    const json = {
      _links: {
        link1: {
          href: "/link1",
          templated: false,
          type: "application/json",
          name: "name of link1",
          title: "title of link1"
        },
        link2: "/link2",
        link3: {
          href: "/link3",
          templated: true,
          type: "application/json",
          name: "name of link3",
          title: "title of link3"
        },
        link4: {
          href: "/link4",
          nonStd: "non standard property"
        }
      }
    };
    const resource = parser.objectToHalResource(client, json, "", HalResource);
    const link1 = resource.getLink<IHalResource>("link1");
    expect(link1).toBeInstanceOf(HalResource);
    expect(link1.getProperty("href")).toBe<string>("/link1");
    expect(link1.getProperty("templated")).toBe<boolean>(false);
    expect(link1.getProperty("type")).toBe<string>("application/json");
    expect(link1.getProperty("name")).toBe<string>("name of link1");
    expect(link1.getProperty("title")).toBe<string>("title of link1");
    expect(link1.uri.resourceUri).toBe<string>("/link1");
    expect(link1.uri.templated).toBe<boolean>(false);

    const link2 = resource.getLink<IHalResource>("link2");
    expect(link2).toBeInstanceOf(HalResource);
    expect(link2.getProperty("href")).toBe<string>("/link2");
    expect(link2.getProperty("templated")).toBeUndefined();
    expect(link2.uri.resourceUri).toBe<string>("/link2");
    expect(link2.uri.templated).toBe<boolean>(false);

    const link3 = resource.getLink<IHalResource>("link3");
    expect(link3).toBeInstanceOf(HalResource);
    expect(link3.getProperty("href")).toBe<string>("/link3");
    expect(link3.getProperty("templated")).toBe<boolean>(true);
    expect(link3.getProperty("type")).toBe<string>("application/json");
    expect(link3.getProperty("name")).toBe<string>("name of link3");
    expect(link3.getProperty("title")).toBe<string>("title of link3");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(link3["_uri"].href).toBe<string>("/link3");
    expect(link3.uri.resourceUri).toBeUndefined();
    expect(link3.uri.templated).toBe<boolean>(true);

    const link4 = resource.getLink<IHalResource>("link4");
    expect(link4).toBeInstanceOf(HalResource);
    expect(link4.getProperty("href")).toBe<string>("/link4");
    expect(link4.getProperty("nonStd")).toBe<string>("non standard property");
  });

  test("link without href throws exception", () => {
    expect.assertions(1);
    const json = {
      _links: {
        link1: {
          notHref: null
        }
      }
    };
    try {
      parser.objectToHalResource(client, json, "", HalResource);
    } catch (error) {
      expect(error).toBeInstanceOf(JSONParserException);
    }
  });

  test("link with href: null", () => {
    const json = {
      _links: {
        link1: {
          href: null
        }
      }
    };
    const resource = parser.objectToHalResource(client, json, "", HalResource);
    expect(resource.getLink<IHalResource>("link1").uri.resourceUri).toBeNull();
    expect(resource.getProperty<IHalResource>("link1").uri.resourceUri).toBeNull();
  });
});
