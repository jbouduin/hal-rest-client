export type TemplateParameter = 'sort' | 'count' | 'offset';

export interface IUriTemplate {
  [key: string]: string | number;
}

export class UriBuilder {
  private static readonly protocol = 'http'
  private static readonly hostname = 'test.hal-rest-client.org';

  public static get baseURI(): string {
    return this.buildUri(UriBuilder.hostname, undefined);
  }

  public static resourceUri(resource: string, id?: number, ...subResource: Array<string | number>): string {
    return UriBuilder.buildUri(UriBuilder.hostname, undefined, resource, id, ...subResource);
  }

  public static templatedResourceUri(resource: string, queryParameters: IUriTemplate): string {
    const queryString = `{?${Object.keys(queryParameters).join(',')}}`;
    return UriBuilder.buildUri(UriBuilder.hostname, queryString, resource);
  }

  public static filledTemplatedResourceUri(resource: string, queryParameters: IUriTemplate): string {
    const queryString = '?' + Array.from(Object.keys(queryParameters)).map((key: string) => `${key}=${queryParameters[key]}`).join('&');
    return UriBuilder.buildUri(UriBuilder.hostname, queryString, resource);
  }

  private static buildUri(hostname: string, queryParameters: string | undefined, ...parts: Array<string | number>): string {
    const asArray = new Array<string>();
    asArray.push(`${UriBuilder.protocol}:/`);
    asArray.push(hostname);
    if (parts) {
      asArray.push(...parts
        .filter((part: string | number) => part ? true : false)
        .map((part: string | number) => (part && typeof part === 'string') ? part : part.toString())
      )
    };
    return `${asArray.join('/')}${queryParameters || ''}`;

  }
}