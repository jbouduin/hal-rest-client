export type HostTld = "com" | "org";

export type BasicQueryParameterKey = "sort" | "offset" | "pageSize";

export interface IQueryParameters {
  [key: string]: string | number;
}

export interface IEmbeddedCollection {
  [key: string]: unknown
}

export interface ILink {
  href: string,
  type?: string,
  templated?: boolean
}

export interface ILinkCollection {
  [key: string]: ILink | Array<ILink> | string | Array<string>
}

export interface IBase {
  [key: string]: unknown
}

export interface IData extends IBase {
  _embedded?: IEmbeddedCollection,
  _links: ILinkCollection
}

export interface IListData {
  queryParameters: IQueryParameters,
  listKey: string,
  listData: Array<IData>
}

export interface IFactoryResult<T extends IData> {
  relativeUri: string;
  absoluteUri: string;
  data: T
}

export interface IFactoryListResult<T extends IData> extends IFactoryResult<T> {
  relativeTemplateUri: string;
  absoluteTemplateUri: string;
}
