import { TemplateFillParameters, UriTemplate } from "./uri-template";

export interface IUriData {
  readonly href: string;
  readonly templated: boolean;
  readonly type: string;
  /**
   * Returns the fetched URI in case of a templated URI, the original href otherwise
   */
  readonly resourceUri: string;
  /** @internal */
  requestedUri: string;
  /** @internal */
  receivedUri: string;
  /** @internal */
  fill(params: TemplateFillParameters): string;
  /** @internal */
  calculateCacheKey(clientBaseUrl: string): string;
}

/** @internal */
export class UriData implements IUriData {
  //#region private properties ------------------------------------------------
  private fetchedURI: string;
  private uriTemplate;
  //#endregion

  //#region public properties -------------------------------------------------
  public href: string;
  public requestedUri: string;
  public receivedUri: string;
  public readonly templated: boolean;
  public readonly type: string;
  //#endregion

  //#region public getter -----------------------------------------------------
  public get resourceUri(): string {
    return this.templated ? this.fetchedURI : this.href;
  }
  //#endregion

  //#region Constructor & C° --------------------------------------------------
  /**
   * @param {string} uri - the uri of the resources this UriDate belongs to.
   * @param {boolean} templated - indicates if the href uri is a templated uri. Defaults to false
   * @param {string} requestedUri - the relative or absolute uri that was used to call the server
   * @param {string} receivedUri - The aboslute uri where Axios got the data from. This can be the end of a redirection chain.
   * @param {string} type - in case of a link, this is the link type (e.g. application/pdf)
   */
  constructor(uri: string, templated = false, requestedUri?: string, receivedUri?: string, type?: string) {
    this.href = uri;
    this.templated = templated;
    this.receivedUri = receivedUri;
    this.requestedUri = requestedUri;
    this.type = type;
    this.fetchedURI = undefined;
    if (templated && uri) {
      this.uriTemplate = new UriTemplate(uri);
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

  public fill(params: TemplateFillParameters = {}): string {
    if (this.templated && this.uriTemplate) {
      return this.uriTemplate.fill(params);
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
