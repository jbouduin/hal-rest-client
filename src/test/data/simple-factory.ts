import { HostTld, IData, IFactoryListResult, IFactoryResult, ILinkCollection, IListData } from "./common-definitions";
import { DataFactory, SelfOption } from "./data-factory";
import { UriBuilder } from "./uri-builder";

export interface ISimpleFactoryResult extends IFactoryResult<IData> {
  id: number;
  relativeCreateUri: string;
  absoluteCreateUri: string;
  queryUri: string;
  sendName: string,
  savedName: string,
  updatedName: string,
  createRequest: object;
  updateNameRequest: object;
  updateNameResponse: IData;
}

export class SimpleFactory extends DataFactory {

  private readonly tld: HostTld;
  public readonly id: number;
  public readonly sendName: string;
  public readonly savedName: string;
  public readonly updatedName: string;

  public constructor(uriBuilder: UriBuilder, tld: HostTld = 'org') {
    super(uriBuilder);
    this.tld = tld;
    this.id = 69;
    this.sendName = 'FANNY';
    this.savedName = 'Fanny';
    this.updatedName = 'Lena';
  }

  /**
   *
   * @param {string} path - relative path to the simple resource(s). Defaults to 'simple'
   * @returns {ISimpleFactoryResult} - the test data
   */
  public createSimpleData(path = 'simple'): ISimpleFactoryResult {

    const fullUri = this.uriBuilder.resourceUri(this.tld, false, path, this.id);

    const result: ISimpleFactoryResult = {
      id: this.id,
      sendName: this.sendName,
      savedName: this.savedName,
      updatedName: this.updatedName,
      createRequest: { name: this.sendName },
      updateNameRequest: { name: this.updatedName },
      relativeUri: this.uriBuilder.resourceUri(this.tld, true, path, this.id),
      absoluteUri: fullUri,
      absoluteCreateUri: this.uriBuilder.resourceUri(this.tld, false, path),
      relativeCreateUri: this.uriBuilder.resourceUri(this.tld, true, path),
      queryUri: this.uriBuilder.templatedResourceUri(this.tld, false, path),
      data: {
        id: this.id,
        name: this.savedName,
        _links: {
          self: { href: fullUri }
        }
      },
      updateNameResponse: {
        id: this.id,
        name: this.updatedName,
        _links: {
          self: { href: fullUri }
        }
      }
    };
    return result;
  }

  public getJumpToTemplate(relative: boolean, path = 'simple', offset?: number) {
    return this.uriBuilder.filledTemplatedResourceUri(
      this.tld,
      relative,
      path,
      {
        offset: offset ? offset : '{jumpTo}',
        sort: 'id',
        pageSize: 20
      }
    );
  }

  public getSimpleListData(offset = 0, path = 'simple'): IFactoryListResult<IData> {

    const links: ILinkCollection = {
      jumpTo: { href: this.getJumpToTemplate(false), templated: true }
    };

    const listData: IListData = {
      queryParameters: this.uriBuilder.getDefaultQueryParameters(offset),
      listKey: "results",
      listData: [{
        id: this.id,
        name: this.savedName,
        _links: {
          self: { href: this.uriBuilder.resourceUri(this.tld, false, path, this.id) }
        }
      }]
    };
    return this.createResourceListData(this.tld, path, listData, links, SelfOption.AbsoluteLink);
  }
}