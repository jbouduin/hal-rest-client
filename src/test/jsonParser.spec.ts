import { createClient, HalResource, IJSONParser, JSONParser, JSONParserException } from ".."
import { UriBuilder } from "./data/uri-builder"
import { ToHalResourceModel, ToModelModel } from "./models";

describe('Generic JSON Parser', () => {
  const uriBuilder = new UriBuilder()
  const client = createClient(uriBuilder.orgBaseURI);
  const parser: IJSONParser = new JSONParser(client);

  test('create HalResource using JSON without _links', () => {
    const json = {
      name: 'name'
    };
    const resource = parser.objectToHalResource(json, '', HalResource);
    expect(resource).toBeInstanceOf(HalResource);
    expect(resource.prop('name')).toBe<string>('name');
  });

  test('create HalResource using JSON without _embedded', () => {
    const json = {
      name: 'name'
    };
    const resource = parser.objectToHalResource(json, '', HalResource);
    expect(resource).toBeInstanceOf(HalResource);
    expect(resource.prop('name')).toBe<string>('name');
  });

  test('create HalResource using empty JSON', () => {
    const json = {}
    const resource = parser.objectToHalResource(json, '', HalResource);
    expect(resource).toBeInstanceOf(HalResource);
    expect(Object.keys(resource.props)).toHaveLength(0);
  });

  test('create HalModel using JSON without _links', () => {
    const json = {
      name: 'name'
    };
    const resource = parser.objectToHalResource(json, '', ToHalResourceModel);
    expect(resource).toBeInstanceOf(ToHalResourceModel);
  });

  test('create HalModel using JSON without _embedded', () => {
    const json = {
      name: 'name'
    };
    const resource = parser.objectToHalResource(json, '', ToHalResourceModel);
    expect(resource).toBeInstanceOf(ToHalResourceModel);
    expect(resource.prop('name')).toBe<string>('name');
  });

  test('create HalModel using empty JSON', () => {
    const json = {}
    const resource = parser.objectToHalResource(json, '', ToHalResourceModel);
    expect(resource).toBeInstanceOf(ToHalResourceModel);
    expect(Object.keys(resource.props)).toHaveLength(0);
  });
});

describe('JSON Parser: links', () => {
  const uriBuilder = new UriBuilder()
  const client = createClient(uriBuilder.orgBaseURI);
  const parser: IJSONParser = new JSONParser(client);

  const testHalResource = (resource: HalResource) => {
    let link1 = resource.link('link1');
    expect(link1).toBeInstanceOf(HalResource)
    expect(link1.prop('href')).toBe<string>('/link1');
    expect(link1.uri.uri).toBe<string>('/link1')
    link1 = resource.prop('link1');
    expect(link1).toBeInstanceOf(HalResource)
    expect(link1.prop('href')).toBe<string>('/link1');
    expect(link1.uri.uri).toBe<string>('/link1')

    let link2 = resource.link('link2');
    expect(link2).toHaveLength(2);
    expect(link2[0]).toBeInstanceOf(HalResource)
    expect(link2[0].prop('href')).toBe<string>('/link2.1');
    expect(link2[0].uri.uri).toBe<string>('/link2.1');
    expect(link2[1]).toBeInstanceOf(HalResource)
    expect(link2[1].prop('href')).toBe<string>('/link2.2');
    expect(link2[1].uri.uri).toBe<string>('/link2.2');
    link2 = resource.prop('link2');
    expect(link2).toHaveLength(2);
    expect(link2[0]).toBeInstanceOf(HalResource)
    expect(link2[0].prop('href')).toBe<string>('/link2.1');
    expect(link2[0].uri.uri).toBe<string>('/link2.1');
    expect(link2[1]).toBeInstanceOf(HalResource)
    expect(link2[1].prop('href')).toBe<string>('/link2.2');
    expect(link2[1].uri.uri).toBe<string>('/link2.2');
  };

  const testToHalResourceModel = (model: ToHalResourceModel) => {
    testHalResource(model);
    expect(model.link1).toBeInstanceOf(HalResource);
    expect(model.link1.prop('href')).toBe<string>('/link1');
    expect(model.link1.uri.uri).toBe<string>('/link1');
    expect(model.link2).toHaveLength(2);
    expect(model.link2[0]).toBeInstanceOf(HalResource);
    expect(model.link2[0].prop('href')).toBe<string>('/link2.1');
    expect(model.link2[0].uri.uri).toBe<string>('/link2.1');
    expect(model.link2[1]).toBeInstanceOf(HalResource);
    expect(model.link2[1].prop('href')).toBe<string>('/link2.2');
    expect(model.link2[1].uri.uri).toBe<string>('/link2.2');
  };

  const testToModelModel = (model: ToModelModel) => {
    testToHalResourceModel(model);
    expect(model.link('link1')).toBeInstanceOf(ToModelModel);
    expect(model.prop('link1')).toBeInstanceOf(ToModelModel)
    expect(model.link1).toBeInstanceOf(ToModelModel);
    const link2 = model.link('link2');
    expect(link2[0]).toBeInstanceOf(ToModelModel);
    expect(link2[1]).toBeInstanceOf(ToModelModel);
    expect(model.link2[0]).toBeInstanceOf(ToModelModel);
    expect(model.link2[1]).toBeInstanceOf(ToModelModel)
  };

  test('HalResource linking to HalResource - string links', () => {
    const toParse = {
      _links: {
        link1: '/link1',
        link2: [
          '/link2.1',
          '/link2.2'
        ]
      }
    };
    const resource = parser.objectToHalResource(toParse, '', HalResource);
    testHalResource(resource);
  });

  test('HalResource linking to HalResource - HAL-spec links', () => {
    const toParse = {
      _links: {
        link1: { href: '/link1' },
        link2: [
          { href: '/link2.1' },
          { href: '/link2.2' }
        ]
      }
    };
    const resource = parser.objectToHalResource(toParse, '', HalResource);
    testHalResource(resource);
  });

  test('HalResource linking to HalResource - mixed links', () => {
    const toParse = {
      _links: {
        link1: { href: '/link1' },
        link2: [
          '/link2.1',
          { href: '/link2.2' }
        ],
        link3: '/link3'
      }
    };
    const resource = parser.objectToHalResource(toParse, '', HalResource);
    testHalResource(resource);
    expect(resource.link('link3')).toBeInstanceOf(HalResource)
    expect(resource.link('link3').prop('href')).toBe<string>('/link3');
  });

  test('HalModel linking to HalResource - string links', () => {

    const toParse = {
      _links: {
        link1: '/link1',
        link2: [
          '/link2.1',
          '/link2.2'
        ]
      }
    };
    const model = parser.objectToHalResource(toParse, '', ToHalResourceModel);
    testToHalResourceModel(model);
  });

  test('HalModel linking to HalResource - HAL-spec links', () => {
    const toParse = {
      _links: {
        link1: { href: '/link1' },
        link2: [
          { href: '/link2.1' },
          { href: '/link2.2' }
        ]
      }
    };
    const model = parser.objectToHalResource(toParse, '', ToHalResourceModel);
    testToHalResourceModel(model);
  });

  test('Halmodel linking to HalResource - mixed links', () => {
    const toParse = {
      _links: {
        link1: { href: '/link1' },
        link2: [
          '/link2.1',
          { href: '/link2.2' }
        ],
        link3: '/link3'
      }
    };
    const model = parser.objectToHalResource(toParse, '', ToHalResourceModel);
    testToHalResourceModel(model);
    expect(model.link('link3')).toBeInstanceOf(HalResource)
    expect(model.link('link3').prop('href')).toBe<string>('/link3');
    expect(model.link3).toBeInstanceOf(HalResource);
    expect(model.link3.uri.uri).toBe<string>('/link3');
  });

  test('HalModel linking to HalModel - all links are strings', () => {
    const uriBuilder = new UriBuilder()
    const client = createClient(uriBuilder.orgBaseURI);
    const parser: IJSONParser = new JSONParser(client);
    const toParse = {
      _links: {
        link1: '/link1',
        link2: [
          '/link2.1',
          '/link2.2'
        ]
      }
    };
    const model = parser.objectToHalResource(toParse, '', ToModelModel);
    testToModelModel(model);
  });

  test('HalModel linking to HalModel - HAL-spec links', () => {
    const toParse = {
      _links: {
        link1: { href: '/link1' },
        link2: [
          { href: '/link2.1' },
          { href: '/link2.2' }
        ]
      }
    };
    const model = parser.objectToHalResource(toParse, '', ToModelModel);
    testToModelModel(model);
  });

  test('Halmodel linking to Halmodel - mixed links', () => {
    const toParse = {
      _links: {
        link1: { href: '/link1' },
        link2: [
          '/link2.1',
          { href: '/link2.2' }
        ],
        link3: '/link3'
      }
    };
    const model = parser.objectToHalResource(toParse, '', ToModelModel);
    testToHalResourceModel(model);
    expect(model.link('link3')).toBeInstanceOf(ToModelModel)
    expect(model.link('link3').prop('href')).toBe<string>('/link3');
    expect(model.link3).toBeInstanceOf(ToModelModel);
    expect(model.link3.uri.uri).toBe<string>('/link3');
  });

  test('extended link properties', () => {
    const json = {
      _links: {
        link1: {
          href: '/link1',
          templated: false,
          type: 'application/json',
          name: 'name of link1',
          title: 'title of link1'
        },
        link2: '/link2',
        link3: {
          href: '/link3',
          templated: true,
          type: 'application/json',
          name: 'name of link3',
          title: 'title of link3'
        },
        link4: {
          href: '/link4',
          nonStd: 'non standard property'
        }
      }
    };
    const resource = parser.objectToHalResource(json, '', HalResource);
    const link1 = resource.link('link1');
    expect(link1).toBeInstanceOf(HalResource);
    expect(link1.prop('href')).toBe<string>('/link1');
    expect(link1.prop('templated')).toBe<boolean>(false);
    expect(link1.prop('type')).toBe<string>('application/json');
    expect(link1.prop('name')).toBe<string>('name of link1');
    expect(link1.prop('title')).toBe<string>('title of link1');
    expect(link1.uri.uri).toBe<string>('/link1');
    expect(link1.uri.templated).toBe<boolean>(false);

    const link2 = resource.link('link2');
    expect(link2).toBeInstanceOf(HalResource);
    expect(link2.prop('href')).toBe<string>('/link2');
    expect(link2.prop('templated')).toBeUndefined();
    expect(link2.uri.uri).toBe<string>('/link2');
    expect(link2.uri.templated).toBe<boolean>(false);

    const link3 = resource.link('link3');
    expect(link3).toBeInstanceOf(HalResource);
    expect(link3.prop('href')).toBe<string>('/link3');
    expect(link3.prop('templated')).toBe<boolean>(true);
    expect(link3.prop('type')).toBe<string>('application/json');
    expect(link3.prop('name')).toBe<string>('name of link3');
    expect(link3.prop('title')).toBe<string>('title of link3');
    expect(link3.uri.uri).toBe<string>('/link3');
    expect(link3.uri.templated).toBe<boolean>(true);

    const link4 = resource.link('link4');
    expect(link4).toBeInstanceOf(HalResource);
    expect(link4.prop('href')).toBe<string>('/link4');
    expect(link4.prop('nonStd')).toBe<string>('non standard property');
  });

  test('link without href throws exception', () => {
    expect.assertions(1);
    const json = {
      _links: {
        link1: {
          notHref: null
        }
      }
    };
    try {
      parser.objectToHalResource(json, '', HalResource);
    } catch (error) {
      expect(error).toBeInstanceOf(JSONParserException)
    }
  });

  test('link with href: null', () => {
    const json = {
      _links: {
        link1: {
          href: null
        }
      }
    };
    const resource = parser.objectToHalResource(json, '', HalResource);
    expect(resource.link('link1').uri.uri).toBeNull();
    expect(resource.link('link1').href).toBeUndefined();
    expect(resource.prop('link1').href).toBeUndefined();
  });
});
