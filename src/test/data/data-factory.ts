import { HostTld, IData, IEmbeddedCollection, ILinkCollection, IListData, IFactoryResult, ILink, IFactoryListResult } from "./common-definitions";
import { UriBuilder } from "./uri-builder";

/**
 * the type of self link that will be created
 */
export enum SelfOption {
  RelativeString = 'a relative string',
  RelativeLink = 'a relative link',
  AbsoluteString = 'an absolute string',
  AbsoluteLink = 'an absolute link',
  NullString = 'a null string',
  NullLink = 'a null link',
  NoSelf = 'not present'
}

/**
 * A base factory for creating test data.
 */
export class DataFactory {
  //#region protected properties ----------------------------------------------
  protected readonly uriBuilder: UriBuilder;
  //#endregion

  //#region Constructor & C° --------------------------------------------------
  public constructor(uriBuilder: UriBuilder) {
    this.uriBuilder = uriBuilder;
  }
  //#endregion

  //#region public methods ----------------------------------------------------
  /**
   * Create test data for a single resource
   *
   * @param {HostTld} tld - one of 'org' or 'com'
   * @param {string} path - the relative path to the resource
   * @param {number } id - the optional id of the resource. Will be added as property and written in the 'self' link
   * @param {IEmbeddedCollection } data - the data that goes into the _embedded property
   * @param {ILinkCollection} links - the links that go into the _links property. The 'self' link will automatically be created
   * @param {SelfOption} selfOption - the kind of self link to create
   * @returns {IFactoryResult} - the factory result
   */
  public createResourceData(tld: HostTld, path: string, id?: number, data?: IEmbeddedCollection, links?: ILinkCollection, selfOption: SelfOption = SelfOption.AbsoluteLink): IFactoryResult<IData> {
    const absolute = this.uriBuilder.resourceUri(tld, false, path, id);
    const relative = this.uriBuilder.resourceUri(tld, true, path, id);
    return {
      relativeUri: relative,
      absoluteUri: absolute,
      data: this.createResource(absolute, relative, selfOption, data, id, links)
    };
  }

  /**
   * Create test data for resource containing an array of resources.
   *
   * @param {HostTld} tld - one of 'org' or 'com'
   * @param {string} path - the relative path to the list resource
   * @param {IListData} data - the listdata
   * @param {ILinkCollection} links - the links that go into the _links property. The 'self' link will automatically be created
   * @param {SelfOption} selfOption - the kind of self link to create   *
   * @returns {IFactoryListResult} - a List result
   */
  public createResourceListData(tld: HostTld, path: string, data: IListData, links?: ILinkCollection, selfOption: SelfOption = SelfOption.AbsoluteLink): IFactoryListResult<IData> {
    const absolute = data.queryParameters ?
      this.uriBuilder.filledTemplatedResourceUri(tld, false, path, data.queryParameters) :
      this.uriBuilder.resourceUri(tld, false, path);
    const relative = data.queryParameters ?
      this.uriBuilder.filledTemplatedResourceUri(tld, true, path, data.queryParameters) :
      this.uriBuilder.resourceUri(tld, true, path);
    const absoluteTemplate = data.queryParameters ?
      this.uriBuilder.templatedResourceUri(tld, false, path, data.queryParameters) :
      this.uriBuilder.resourceUri(tld, false, path);
    const relativeTemplate = data.queryParameters ?
      this.uriBuilder.templatedResourceUri(tld, true, path, data.queryParameters) :
      this.uriBuilder.resourceUri(tld, true, path);
    return {
      relativeUri: relative,
      absoluteUri: absolute,
      relativeTemplateUri: relativeTemplate,
      absoluteTemplateUri: absoluteTemplate,
      data: this.createListResource(absolute, relative, selfOption, data, links)
    };
  }

  public addLinkToFactoredData(data: IData, key: string, link: ILink | string): void {
    if (!data._links) {
      data._links = {};
    }
    const toUse: ILink = typeof link === 'string' ?
      { href: link } :
      link
    data._links[key] = toUse;
  }

  public addArrayOfLinksToFactoredData(data: IData, key: string, links: Array<string>): void {
    if (!data._links) {
      data._links = {};
    }
    const toUse: Array<ILink> = links.map((link: string) => { return { href: link } });
    data._links[key] = toUse;
  }
  //#endregion

  //#region private methods ---------------------------------------------------
  private createResource(
    absoluteUri: string,
    relativeUri: string,
    selfOption: SelfOption,
    data?: IEmbeddedCollection,
    id?: number,
    links?: ILinkCollection): IData {

    const result: IData = {
      _links: this.getLinks(absoluteUri, relativeUri, selfOption, links)
    };

    if (data) {
      result._embedded = data;
    }

    if (id) {
      result['id'] = id;
    }

    return result;
  }

  private createListResource(absolute: string, relative: string, selfOption: SelfOption, data: IListData, links?: ILinkCollection): IData {
    const result: IData = {
      count: data.listData.length,
      _embedded: {},
      _links: this.getLinks(absolute, relative, selfOption, links)
    }
    Object.keys(data.queryParameters).forEach((key: string) => {
      result[key] = data.queryParameters[key];
    });
    result._embedded[data.listKey] = data.listData;
    return result;
  }

  private getLinks(absoluteUri: string, relativeUri: string, selfOption: SelfOption, links?: ILinkCollection): ILinkCollection {
    const result: ILinkCollection = links || {};
    let selfLink: ILink | string;
    if (selfOption != SelfOption.NoSelf && !result['self']) {
      switch (selfOption) {
        case SelfOption.AbsoluteLink:
          selfLink = {
            href: absoluteUri
          };
          break;
        case SelfOption.AbsoluteString:
          selfLink = absoluteUri
          break;
        case SelfOption.NullLink:
          selfLink = {
            href: null
          };
          break;
        case SelfOption.NullString:
          selfLink = null;
          break;
        case SelfOption.RelativeLink:
          selfLink = {
            href: relativeUri
          };
          break;
        case SelfOption.RelativeString:
          selfLink = relativeUri;
          break;
        default:
          selfLink = null;
      }
      result['self'] = selfLink;
    }
    return result
  }
  //#endregion
}