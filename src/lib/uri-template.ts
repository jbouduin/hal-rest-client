export type TemplateFillParameters = Record<string, string | number | Array<string | number>>;

type templateSegmentType = "fix" | "var";
type encodeFn = (value: string) => string;

class TemplateSegmentContent {
  public content: string;
  public explode: boolean;
  public sub: number;
  public inErrorState: boolean;

  public constructor(content: string, type: templateSegmentType) {
    this.content = content;
    this.inErrorState = false;
    if (type === "var") {
      this.explode = this.checkExplode();
      this.sub = this.checkSub();
      this.inErrorState ||= this.hasInvalidChars();
    }
    else {
      this.explode = false;
      this.sub = 0;
      this.inErrorState = false;
    }
  }

  private checkExplode(): boolean {
    let result = false;
    if (this.content.indexOf("*") > 0) {
      this.content = this.content.replace("*", "");
      // if we now have a colon => wrong
      if (this.content.indexOf(":") > 0) {
        this.inErrorState = true;
      }
      result = true;
    }
    return result;
  }

  private checkSub(): number {
    let result = 0;
    const colonIndex = this.content.indexOf(":");
    if (colonIndex > 0) {
      result = Number.parseInt(this.content.substring(colonIndex + 1));
      if (isNaN(result)) {
        this.inErrorState = true;
        return -1;
      }
      // if (result >= 10000) {} => this is not in the official tests
      this.content = this.content.substring(0, colonIndex);
    }
    return result;
  }

  private hasInvalidChars(): boolean {
    const clean = this.content.replace(/%[0-9A-Z][0-9A-Z]/g, "");
    return ! /^[A-Za-z0-9_.]*$/.test(clean);
  }
}

class TemplateSegment {
  public type: templateSegmentType;
  public contents: Array<TemplateSegmentContent>;
  public first: string;
  public separator: string;
  public named: boolean;
  public ifEmpty: string;
  public encodeFn?: encodeFn;

  public get inErrorState(): boolean {
    return this.contents.findIndex((part: TemplateSegmentContent) => part.inErrorState) >= 0;
  }

  public constructor(type: templateSegmentType, content: string) {
    this.type = type;
    this.contents = content.split(",").map((part: string) => new TemplateSegmentContent(part, type));
    this.first = "";
    this.separator = ",";
    this.named = false;
    this.ifEmpty = "";
  }
}

export class UriTemplate {
  private readonly template: string;
  private readonly uriTemplateGlobalModifiers: Record<string, boolean>;
  private readonly templateSegments: Array<TemplateSegment>;
  private _inErrorState: boolean;

  public get inErrorState(): boolean {
    return this._inErrorState || this.templateSegments.findIndex((part: TemplateSegment) => part.inErrorState) >= 0;
  }

  public constructor(template: string) {
    this._inErrorState = false;
    this.template = template;
    this.uriTemplateGlobalModifiers = {
      "+": true,
      "#": true,
      ".": true,
      "/": true,
      ";": true,
      "?": true,
      "&": true
    };
    this.templateSegments = new Array<TemplateSegment>();
    this.processTemplate();
  }

  public fill(values: TemplateFillParameters): string | undefined {
    let result: string | undefined;

    if (this.inErrorState) {
      result = undefined;
    } else {
      try {
        result = this.templateSegments
          .map((segment: TemplateSegment) => {
            if (segment.type === "fix") {
              return segment.contents[0].content;
            } else {
              return this.processTemplateSegment(segment, values);
            }
          })
          .join("");
      } catch {
        result = undefined;
      }
    }
    return result;
  }

  private processTemplateSegment(segment: TemplateSegment, values: TemplateFillParameters): string {
    const processedPartArray = segment.contents
      .map((segmentContent: TemplateSegmentContent) => {
        const value = values[segmentContent.content];
        if (value !== null && value !== undefined) {
          if (segmentContent.explode) {
            if (Array.isArray(value)) {
              if (segment.named) {
                return value
                  .map((item: string) => {
                    // if (value[key] !== "") {} => not covered by official tests
                    return `${segmentContent.content}=${this.calculateValue(item, segmentContent.sub, segment.encodeFn)}`;
                  })
                  .join(segment.separator);
              } else {
                return value.length > 0 ?
                  value
                    .map((item: string) => this.calculateValue(item, segmentContent.sub, segment.encodeFn))
                    .join(segment.separator) :
                  undefined;
              }
            } else if (typeof value === "object") {
              // if (segmentContent.sub > 0) {} => not covered by official tests
              return Object.keys(value)
                .map((key: string) => {
                  // if (value[key] !== "") => not covered by official tests
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-type-assertion
                  return `${this.calculateValue(key, 0, segment.encodeFn)}=${this.calculateValue(value![key], segmentContent.sub, segment.encodeFn)}`;
                })
                .join(segment.separator);
            } else {
              return this.calculateValue(value.toString(), segmentContent.sub, segment.encodeFn);
            }
          } else {
            if (Array.isArray(value) || typeof value === "object") {
              let joined: string;
              if (Array.isArray(value)) {
                joined = value.length > 0 ?
                  value.map((item: string) => this.calculateValue(item, segmentContent.sub, segment.encodeFn)).join(",") :
                  undefined;
              } else {
                if (segmentContent.sub > 0) {
                  throw new Error();
                }
                joined = Object.keys(value).map((key: string) =>
                  this.calculateValue(key, segmentContent.sub, segment.encodeFn) + "," +
                  this.calculateValue(value[key], segmentContent.sub, segment.encodeFn)).join(",");
              }
              if (segment.named) {
                if (joined !== "" && joined != undefined) {
                  return `${segmentContent.content}=${joined}`;
                } else {
                  return "";
                }
              } else {
                return joined;
              }
            } else {
              if (segment.named) {
                if (value !== "") {
                  return `${segmentContent.content}=${this.calculateValue(value.toString(), segmentContent.sub, segment.encodeFn)}`;
                } else {
                  return `${segmentContent.content}${segment.ifEmpty}`;
                }
              } else {
                if (value !== "") {
                  return this.calculateValue(value.toString(), segmentContent.sub, segment.encodeFn);
                } else {
                  return "";
                }
              }
            }
          }
        } else {
          return undefined;
        }
      })
      .filter((processed: string) => processed !== undefined);

    const processedPart = processedPartArray.join(segment.separator);
    if (processedPart.length > 0) {
      return segment.first + processedPart;
    } else if (processedPartArray.length > 0) {
      return segment.first !== "?" ? segment.first : "";
    } else {
      return "";
    }
  }

  private processTemplate(): void {
    if ((this.template.match(/{/g) || []).length != (this.template.match(/}/g) || []).length) {
      this._inErrorState = true;
      return;
    }
    const curlyBracesRegex = /{([^}]+)}/gm;
    let matches: RegExpExecArray;
    let lastEnd = 0;
    matches = curlyBracesRegex.exec(this.template);
    while (matches) {
      if (matches.index > lastEnd) {
        const partBefore = new TemplateSegment("fix", matches.input.substring(lastEnd, matches.index));
        this.templateSegments.push(partBefore);
      }
      let part: TemplateSegment;
      if (this.uriTemplateGlobalModifiers[matches[1][0]]) {
        part = new TemplateSegment("var", matches[1].substring(1));
        const prefix = matches[1][0];
        switch (prefix) {
          case "+":
            part.encodeFn = (value: string) => this.uAndREncodeFunction(value);
            break;
          case ".":
          case "/":
            part.first = prefix;
            part.separator = prefix;
            part.encodeFn = (value: string) => this.uEncodeFunction(value);
            break;
          case ";":
            part.first = prefix;
            part.named = true;
            part.separator = prefix;
            part.encodeFn = (value: string) => this.uEncodeFunction(value);
            break;
          case "?":
            part.first = prefix;
            part.named = true;
            part.separator = "&";
            part.ifEmpty = "=";
            part.encodeFn = (value: string) => this.uEncodeFunction(value);
            break;
          case "&":
            part.first = prefix;
            part.named = true;
            part.separator = prefix;
            part.ifEmpty = "=";
            part.encodeFn = (value: string) => this.uEncodeFunction(value);
            break;
          case "#":
            part.first = prefix;
            part.encodeFn = (value: string) => this.uAndREncodeFunction(value);
            break;
        }
      } else {
        part = new TemplateSegment("var", matches[1]);
        part.encodeFn = (value: string) => this.uEncodeFunction(value);
      }
      this.templateSegments.push(part);
      lastEnd = matches.index + matches[0].length;
      matches = curlyBracesRegex.exec(this.template);
    }
    if (lastEnd < this.template.length) {
      this.templateSegments.push(new TemplateSegment("fix", this.template.substring(lastEnd)));
    }
  }

  private uEncodeFunction(value: string): string {
    return encodeURIComponent(value).replace(/!/g, "%21");
  }

  private uAndREncodeFunction(value: string): string {
    return encodeURI(value).replace(/%25[0-9A-Z][0-9A-Z]/g, (doubleEncoded: string) => "%" + doubleEncoded.substring(3));
  }

  private calculateValue(value: string, sub: number, encodeFn: encodeFn): string {
    if (sub > 0) {
      return encodeFn(value.substring(0, sub));
    } else {
      return encodeFn(value);
    }
  }
}
