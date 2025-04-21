export class JSONParserException extends Error {
  //#region public properties -------------------------------------------------
  public readonly json: unknown;
  //#endregion

  //#region Constructor & C° --------------------------------------------------
  public constructor(json: unknown, message?: string) {
    super(message || "Provided data is not a HAL-resource");
    Object.setPrototypeOf(this, JSONParserException.prototype);
    this.json = json;
  }
  //#endregion
}
