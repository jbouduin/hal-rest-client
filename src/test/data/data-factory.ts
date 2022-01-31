import { HostTld, IData, IEmbeddedCollection, ILinkCollection, IListData, IFactoryResult, ILink } from "./common-definitions";
import { UriBuilder } from "./uri-builder";

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
   * Create a single resource
   * @param tld one of 'org' or 'com'
   * @param path the relative path to the resource
   * @param id the optional id of the resource. Will be added as property and written in the 'self' link
   * @param data the data that goes into the _embedded property
   * @param links the links that go into the _links property. The 'self' link will automatically be created
   * @returns the object
   */
  public createResourceData(tld: HostTld, path: string, id?: number, data?: IEmbeddedCollection, links?: ILinkCollection): IFactoryResult<IData> {
    const selfUri = this.uriBuilder.resourceUri(tld, false, path, id);
    return {
      relativeUri: this.uriBuilder.resourceUri(tld, true, path, id),
      fullUri: selfUri,
      data: this.createResource(selfUri, data, id, links)
    };
  }

  /**
   * Create a resource containing an array of resources
   * @param tld one of 'org' or 'com'
   * @param path the relative path to the list resource
   * @param data the listdata
   * @param links the links that go into the _links property. The 'self' link will automatically be created
   * @returns
   */
  public createResourceListData(tld: HostTld, path: string, data: IListData, links?: ILinkCollection): IFactoryResult<IData> {
    const selfUri = data.queryParameters ?
      this.uriBuilder.filledTemplatedResourceUri(tld, false, path, data.queryParameters) :
      this.uriBuilder.resourceUri(tld, false, path);
    return {
      relativeUri: this.uriBuilder.filledTemplatedResourceUri(tld, true, path, data.queryParameters),
      fullUri: selfUri,
      data: this.createListResource(selfUri, data, links)
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
  //#endregion

  //#region private methods ---------------------------------------------------
  private createResource(selfUri: string, data?: IEmbeddedCollection, id?: number, links?: ILinkCollection): IData {
    const result: IData = {
      _links: this.getLinks(selfUri, links)
    };

    if (data) {
      result._embedded = data;
    }

    if (id) {
      result['id'] = id;
    }

    return result;
  }

  private createListResource(selfUri: string, data: IListData, links?: ILinkCollection): IData {
    const result: IData = {
      count: data.listData.length,
      _embedded: {},
      _links: this.getLinks(selfUri, links)
    }
    Object.keys(data.queryParameters).forEach((key: string) => {
      result[key] = data.queryParameters[key];
    });
    result._embedded[data.listKey] = data.listData;
    return result;
  }

  private getLinks(selfUri: string, links?: ILinkCollection): ILinkCollection {
    const result: ILinkCollection = links || {};
    result['self'] = {
      href: selfUri
    };
    return result
  }
  //#endregion
}