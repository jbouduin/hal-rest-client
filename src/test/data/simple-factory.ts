import { send } from "process";
import { IData, IFactoryListResult, IFactoryResult, ILinkCollection, IListData } from "./common-definitions";
import { DataFactory, SelfOption } from "./data-factory";
import { UriBuilder } from "./uri-builder";

export interface ISimpleFactoryResult extends IFactoryResult<IData> {
  id: number;
  createUri: string;
  queryUri: string;
  sendName: string,
  savedName: string,
  createRequest: any;
  updateNameRequest: any;
}

export class SimpleFactory extends DataFactory {

  public readonly path: string;
  public readonly id: number;
  public readonly sendName: string;
  public readonly savedName: string;
  public readonly updatedName: string;

  public constructor(uriBuilder: UriBuilder) {
    super(uriBuilder);
    this.path = 'simple';
    this.id = 69;
    this.sendName = 'FANNY';
    this.savedName = 'Fanny';
    this.updatedName = 'Lena';
  }

  public getSimpleData(): ISimpleFactoryResult {

    const fullUri = this.uriBuilder.resourceUri('org', false, this.path, this.id);

    const result: ISimpleFactoryResult = {
      id: this.id,
      sendName: "FANNY",
      savedName: "Fanny",
      createRequest: { name: this.sendName },
      updateNameRequest: { name: this.updatedName },
      relativeUri: this.uriBuilder.resourceUri('org', true, this.path, this.id),
      fullUri: fullUri,
      createUri: this.uriBuilder.resourceUri('org', false, this.path),
      queryUri: this.uriBuilder.templatedResourceUri('org', false, this.path),
      data: {
        id: this.id,
        name: this.savedName,
        _links: {
          self: { href: fullUri }
        }
      }
    };
    return result;
  }

  public getJumpToTemplate(relative: boolean, offset?: number) {
    return this.uriBuilder.filledTemplatedResourceUri(
      'org',
      relative,
      this.path,
      {
        offset: offset ? offset : '{jumpTo}',
        sort: 'id',
        pageSize: 20
      }
    );
  }
  public getSimpleListData(offset = 0): IFactoryListResult<IData> {

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
          self: { href: this.uriBuilder.resourceUri('org', false, this.path, this.id) }
        }
      }]
    };
    return this.createResourceListData('org', this.path, listData, links, SelfOption.AbsoluteLink);
  }
}