import { HostTld, UriBuilder } from "./uri-builder";

export interface EmbeddedCollection {
  [key: string]: any
}
export interface Link {
  href: string
}

export interface LinkCollection {
  [key: string]: Link
}

export interface IDummy {
  id: number,
  _embedded: EmbeddedCollection,
  _links: LinkCollection
}

export interface IScopeResult<T extends IDummy> {
  resourceUri: string;
  selfUri: string;
  result: T
}

export class DummyFactory {
  //#region private properties ------------------------------------------------
  private readonly uriBuilder: UriBuilder;
  //#endregion

  //#region Constructor & C° --------------------------------------------------
  public constructor(uriBuilder: UriBuilder) {
    this.uriBuilder = uriBuilder;
  }
  //#endregion
  //#region public methods ----------------------------------------------------
  public createDummyData(tld: HostTld, path: string, id: number, data?: EmbeddedCollection): IScopeResult<IDummy> {
    const selfUri = this.uriBuilder.resourceUri(tld, false, path, id);

    return {
      resourceUri: this.uriBuilder.resourceUri(tld, true, path, id),
      selfUri: selfUri,
      result: this.createDummy(id, selfUri, data || { data: 'dummy data' })
    };
  }
  //#endregion

  //#region private methods ---------------------------------------------------
  private createDummy(id: number, selfUri: string, data: EmbeddedCollection): IDummy {
    const result: IDummy = {
      id: id,
      _embedded: data,
      _links: {
        self: {
          href: selfUri
        }
      }
    }
    return result;
  }
  //#endregion
}