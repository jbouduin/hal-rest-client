import { HostTld, UriBuilder } from "./uri-builder";

export interface IEmbeddedCollection {
  [key: string]: any
}
export interface ILink {
  href: string
}

export interface ILinkCollection {
  [key: string]: ILink
}

export interface IBase {
  [key: string]: any
}

export interface IData extends IBase {
  _embedded: IEmbeddedCollection,
  _links: ILinkCollection
}

export interface IListData {
  offset: number,
  sort: string,
  listKey: string,
  listData: Array<IData>
}

export interface IScopeResult<T extends IData> {
  resourceUri: string;
  selfUri: string;
  result: T
}

export class DataFactory {
  //#region private properties ------------------------------------------------
  private readonly uriBuilder: UriBuilder;
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
   * @param id the id of the resource. Will be added as property and written in the 'self' link
   * @param data the data that goes into the _embedded property
   * @param links the links that go into the _links property. The 'self' link will automatically be created
   * @returns the object
   */
  public createResourceData(tld: HostTld, path: string, id: number, data?: IEmbeddedCollection, links?: ILinkCollection): IScopeResult<IData> {
    const selfUri = this.uriBuilder.resourceUri(tld, false, path, id);
    return {
      resourceUri: this.uriBuilder.resourceUri(tld, true, path, id),
      selfUri: selfUri,
      result: this.createResource(id, selfUri, data || { data: 'dummy data' }, links)
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
  public createResourceListData(tld: HostTld, path: string, data: IListData, links?: ILinkCollection): IScopeResult<IData> {
    const selfUri = this.uriBuilder.resourceUri(tld, false, path);
    return {
      resourceUri: this.uriBuilder.resourceUri(tld, true, path),
      selfUri: selfUri,
      result: this.createListResource(selfUri, data, links)
    };
  }
  //#endregion

  //#region private methods ---------------------------------------------------
  private createResource(id: number, selfUri: string, data: IEmbeddedCollection, links?: ILinkCollection): IData {
    const result: IData = {
      id: id,
      _embedded: data,
      _links: this.getLinks(selfUri, links)
    }
    return result;
  }

  private createListResource(selfUri: string, data: IListData, links?: ILinkCollection): IData {
    const result: IData = {
      count: data.listData.length,
      offset: data.offset,
      sort: data.sort,
      _embedded: {

      },
      _links: this.getLinks(selfUri, links)
    }
    result._embedded[data.listKey] = data.listData;
    return result;
  }

  private getLinks(selfUri: string, links?: ILinkCollection): ILinkCollection {
    console.log(JSON.stringify(links))
    const result: ILinkCollection = links || {};
    result['self'] = {
      href: selfUri
    };
    console.log(JSON.stringify(result))
    return result
  }
  //#endregion
}