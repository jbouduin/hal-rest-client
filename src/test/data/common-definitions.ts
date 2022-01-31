export type HostTld = 'com' | 'org';

export interface IQueryParameters {
  [key: string]: string | number;
}

export interface IEmbeddedCollection {
  [key: string]: any
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
  [key: string]: any
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
  fullUri: string;
  data: T
}
