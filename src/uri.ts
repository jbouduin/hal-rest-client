import * as uriTemplates from 'uri-templates';

export class URI {
  //#region private properties ------------------------------------------------
  private fetchedURI: string;
  private uriTemplates;
  //#endregion

  //#region public properties -------------------------------------------------
  public readonly uri: string;
  //#endregion

  //#region public getter -----------------------------------------------------
  /**
   * Returns the fetched URI in case of a templated URI, the original URI otherwise
   */
  public get resourceURI(): string {
    return this.templated ? this.fetchedURI : this.uri;
  }
  //#endregion

  //#region Constructor & C° --------------------------------------------------
  /**
   * Creates a URI
   * @param uri
   * @param templated defaults to false
   */
  constructor(uri: string, public templated: boolean = false) {
    this.uri = uri;
    this.fetchedURI = '';
    if (templated) {
      this.uriTemplates = uriTemplates(uri);
    }
  }
  //#endregion

  //#region public methods ----------------------------------------------------
  public setFetchedUri(fetchedUri: string): void {
    if (!this.templated) {
      throw new Error('You can not set the fetched URI of a templated URI')
    } else {
      this.fetchedURI = fetchedUri;
    }

  }
  public fill(params: object = {}): string {
    if (this.templated && this.uriTemplates) {
      return this.uriTemplates.fill(params);
    } else {
      return this.uri;
    }
  }
  //#endregion
}
