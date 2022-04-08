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
  createRequest: Record<string, unknown>;
  updateNameRequest: Record<string, unknown>;
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
   * @param {SelfOption} selfOption - kind of self link to generate
   * @returns {ISimpleFactoryResult} - the test data
   */
  public createSimpleData(path = 'simple', selfOption: SelfOption = SelfOption.AbsoluteString): ISimpleFactoryResult {

    const fullUri = this.uriBuilder.resourceUri(this.tld, false, path, this.id);
    const relativeUri = this.uriBuilder.resourceUri(this.tld, true, path, this.id);

    let links: ILinkCollection;
    switch (selfOption) {
      case SelfOption.AbsoluteLink:
        links = { self: { href: fullUri } };
        break;
      case SelfOption.AbsoluteString:
        links = { self: fullUri };
        break;
      case SelfOption.NoSelf:
        links = {};
        break;
      case SelfOption.NullLink:
        links = { self: { href: null } };
        break;
      case SelfOption.NullString:
        links = { self: null };
        break;
      case SelfOption.RelativeLink:
        links = { self: { href: relativeUri } };
        break;
      case SelfOption.RelativeString:
        links = { self: relativeUri };
        break;
    }

    const result: ISimpleFactoryResult = {
      id: this.id,
      sendName: this.sendName,
      savedName: this.savedName,
      updatedName: this.updatedName,
      createRequest: { name: this.sendName },
      updateNameRequest: { name: this.updatedName },
      relativeUri: relativeUri,
      absoluteUri: fullUri,
      absoluteCreateUri: this.uriBuilder.resourceUri(this.tld, false, path),
      relativeCreateUri: this.uriBuilder.resourceUri(this.tld, true, path),
      queryUri: this.uriBuilder.templatedResourceUri(this.tld, false, path),
      data: {
        id: this.id,
        name: this.savedName,
        _links: links
      },
      updateNameResponse: {
        id: this.id,
        name: this.updatedName,
        _links: links
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

  public getChangeSizeTemplate(relative: boolean, offset: number, path = 'simple', pageSize?: number) {
    return this.uriBuilder.filledTemplatedResourceUri(
      this.tld,
      relative,
      path,
      {
        offset: offset,
        sort: 'id',
        pageSize:  pageSize ? pageSize : '{pageSize}'
      }
    );
  }

  public createSimpleListData(offset = 0, path = 'simple'): IFactoryListResult<IData> {

    const links: ILinkCollection = {
      jumpTo: { href: this.getJumpToTemplate(false), templated: true },
      changeSize: { href: this.getChangeSizeTemplate(false, offset)}
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