import { HostTld, IQueryParameters } from "./common-definitions";

export class UriBuilder {
  //#region private properties ------------------------------------------------
  private protocol: string;
  private hosts: Map<HostTld, string>;
  //#endregion

  //#region Constructor & C° --------------------------------------------------
  constructor() {
    this.protocol = 'http://'
    this.hosts = new Map<HostTld, string>();
    this.hosts.set('org', 'test.hal-rest-client.org');
    this.hosts.set('com','test.hal-rest-client.com');
  }
  //#endregion

  //#region public getters ----------------------------------------------------
  public get orgBaseURI(): string {
    return this.buildUri('org', false, undefined);
  }

  public get comBaseURI(): string {
    return this.buildUri('com', false, undefined);
  }

  public get allTld(): Array<HostTld> {
    return Array.from(this.hosts.keys());
  }
  //#endregion

  //#region public methods ----------------------------------------------------
  public baseUri(tld: HostTld): string {
    return this.buildUri(tld, false, undefined);
  }

  public resourceUri(tld: HostTld, relative: boolean, resource: string, id?: number, ...subResource: Array<string | number>): string {
    return this.buildUri(tld, relative, undefined, resource, id, ...subResource);
  }

  public templatedResourceUri(tld: HostTld, relative: boolean,resource: string, queryParameters: IQueryParameters): string {
    const queryString = `{?${Object.keys(queryParameters).join(',')}}`;
    return this.buildUri(tld, relative, queryString, resource);
  }

  public filledTemplatedResourceUri(tld: HostTld, relative: boolean,resource: string, queryParameters: IQueryParameters): string {
    const queryString = '?' + Array.from(Object.keys(queryParameters)).map((key: string) => `${key}=${queryParameters[key]}`).join('&');
    return this.buildUri(tld, relative, queryString, resource);
  }
  //#endregion

  //#region private methods ---------------------------------------------------
  private buildUri(tld: HostTld, relative: boolean, queryParameters: string | undefined, ...parts: Array<string | number>): string {
    const asArray = new Array<string>();
    if (!relative) {
      asArray.push(this.hosts.get(tld));
    }
    if (parts) {
      asArray.push(...parts
        .filter((part: string | number) => part ? true : false)
        .map((part: string | number) => (part && typeof part === 'string') ? part : part.toString())
      )
    }
    return `${relative ? '/' : this.protocol}${asArray.join('/')}${queryParameters || ''}`;
  }
  //#endregion
}