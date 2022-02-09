import * as uriTemplates from 'uri-templates';

/** @internal */
export class UriData {
  //#region private properties ------------------------------------------------
  private fetchedURI: string;

  private uriTemplates;
  //#endregion

  //#region public properties -------------------------------------------------
  public readonly href: string;
  public readonly requestedUri: string;
  public readonly receivedUri: string
  public readonly templated: boolean;
  public readonly type: string;
  //#endregion

  //#region public getter -----------------------------------------------------
  /**
   * Returns the fetched URI in case of a templated URI, the original URI otherwise
   */
  public get resourceURI(): string {
    return this.templated ? this.fetchedURI : this.href;
  }
  //#endregion

  //#region Constructor & C° --------------------------------------------------
  /**
   * Creates a URI
   * @param href usually the self link of a resource,
   * @param templated defaults to false
   * @param requestedUri
   * @param receivedUri
   */
  constructor(uri: string, templated = false, requestedUri?: string, receivedUri?: string, type?: string) {
    this.href = uri;
    this.templated = templated;
    this.receivedUri = receivedUri;
    this.requestedUri = requestedUri;
    this.type = type;
    this.fetchedURI = '';
    if (templated && uri) {
      this.uriTemplates = uriTemplates(uri);
    }
  }
  //#endregion

  //#region public methods ----------------------------------------------------
  public setFetchedUri(fetchedUri: string): void {
    if (!this.templated) {
      throw new Error('You can not set the fetched URI of a non templated URI')
    } else {
      this.fetchedURI = fetchedUri;
    }
  }

  public fill(params: object = {}): string {
    if (this.templated && this.uriTemplates) {
      return this.uriTemplates.fill(params);
    } else {
      return this.href || this.requestedUri;
    }
  }

  public calculateCacheKey(clientBaseUrl: string): string {
    // calculate the cache key:
    // if no self-link => No caching
    // if self-link is templated => no caching
    // self-link is absolute => cache using self-link as key
    // rest client has no base URI and self-link is relative => no caching
    // rest client has a base URI and resource was retrieve from a different base URI => no cache
    // rest client has a base URI and self-link is relative => cache using combined base URI and self-link
    // rest client has a base URI and self-link is absolute and starts with the baseURL of the rest client => use self-link as cache key
    // rest client has a base URI and self-link is absolute but does not start with the baseURL of the rest client => no caching

    // calculate the cache key:
    // if no href value => No caching
    // if templated => no caching
    // if type and type is not hal+json => no caching
    // rest client has no base URI and href is absolute => cache using href as key
    // rest client has no base URI and href is relative => no caching

    // rest client has a base URI and href is relative => cache using combined base URI and href
    // rest client has a base URI and href is absolute and starts with the baseURL of the rest client => use href as cache key
    // rest client has a base URI and href is absolute but does not start with the baseURL of the rest client => no caching

    let result: string;
    // the href is required
    // the uri may not be templated
    // if there is a type, it must be hal+json
    if (this.href && !this.templated && (!this.type || this.type === 'application/hal+json')) {
      if (this.isAbsolute(this.href)) {
        result = this.href;
      } else if (clientBaseUrl) {
        if ((this.isAbsolute(this.requestedUri) && this.requestedUri.toLowerCase().startsWith(clientBaseUrl.toLowerCase())) ||
          !this.isAbsolute(this.requestedUri)) {
          result = `${clientBaseUrl}${this.href}`;
        }
      }
    }
    return result;
  }
  //#endregion

  private isAbsolute(href: string): boolean {
    return href ? href.toLowerCase().startsWith('http') : false;
  }
}
