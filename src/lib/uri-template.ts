
type templateSegmentType = 'fix' | 'var';
type encodeFn = (value: string) => string;

class TemplateSegmentContent {
  public content: string;
  public explode: boolean;
  public sub: number;
  public inErrorState: boolean;

  public constructor(content: string, type: templateSegmentType) {
    this.content = content;
    this.inErrorState = false;
    this.explode = type === 'var' && this.checkExplode();
    this.sub = type === 'var' ? this.checkSub() : 0;
  }

  private checkExplode(): boolean {
    let result = false;
    if (this.content.indexOf('*') > 0) {
      this.content = this.content.replace('*', '')
      // TODO check what follows
      result = true;
    }
    return result;
  }

  private checkSub(): number {
    let result = 0;
    const colonIndex = this.content.indexOf(':')
    if (colonIndex > 0) {
      result = Number.parseInt(this.content.substring(colonIndex + 1));
      this.content = this.content.substring(0, colonIndex);
    }
    return result;
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
    this.contents = content.split(',').map((part: string) => new TemplateSegmentContent(part, type));
    this.first = '';
    this.separator = ',';
    this.named = false;
    this.ifEmpty = '';
  }
}

export class UriTemplate {

  private readonly template: string;
  private readonly uriTemplateGlobalModifiers: Record<string, boolean>;
  private readonly templateSegments: Array<TemplateSegment>;

  public get inErrorState(): boolean {
    return this.templateSegments.findIndex((part: TemplateSegment) => part.inErrorState) >= 0;
  }

  public constructor(template: string) {
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

  public fill(values: Record<string, string | Array<string>>): string | undefined {
    if (this.inErrorState) {
      return undefined;
    }

    const result = this.templateSegments
      .map((segment: TemplateSegment) => {
        if (segment.type === 'fix') {
          return segment.contents[0].content;
        } else {
          return this.processTemplateSegment(segment, values);
        }
      })
      .join('');

    return result;
  }

  private processTemplateSegment(segment: TemplateSegment, values: Record<string, string | Array<string>>): string {
    const processedPartArray = segment.contents
      .map((segmentContent: TemplateSegmentContent) => {
        const value = values[segmentContent.content];
        if (value !== null && value !== undefined) {
          if (segmentContent.explode) {
            if (Array.isArray(value)) {
              if (segment.named) {
                return value
                  .map((item: string) => {
                    if (item !== '') {
                      return `${segmentContent.content}=${this.calculateValue(item, segmentContent.sub, segment.encodeFn)}`;
                    } else {
                      // TODO this is not covered by official tests
                      return `${segmentContent.content}${segment.ifEmpty}`;
                    }
                  })
                  .join(segment.separator);
              } else {
                return value.length > 0 ?
                  value
                    .map((item: string) => this.calculateValue(item, segmentContent.sub, segment.encodeFn))
                    .join(segment.separator) :
                  undefined;
              }
            } else if (typeof value === 'object') {
              // if (templatePart.named) => not required, exploded objects are always named
              return Object.keys(value)
                .map((key: string) => {
                  if (value[key] !== '') {
                    return `${key}=${this.calculateValue(value[key], segmentContent.sub, segment.encodeFn)}`;
                  } else {
                    // TODO this is not covered by official tests
                    return `${key}${segment.ifEmpty}`;
                  }
                })
                .join(segment.separator);
            } else {
              // TODO is this case compliant ?
            }
          } else {
            if (Array.isArray(value) || typeof value === 'object') {
              let joined: string;
              if (Array.isArray(value)) {
                joined = value.length > 0 ?
                  value.map((item: string) => this.calculateValue(item, segmentContent.sub, segment.encodeFn)).join(',') :
                  undefined;
              } else {
                joined = Object.keys(value).map((key: string) =>
                  this.calculateValue(key, segmentContent.sub, segment.encodeFn) + ',' +
                  this.calculateValue(value[key], segmentContent.sub, segment.encodeFn)).join(',');
              }
              if (segment.named) {
                if (joined !== '') {
                  return `${segmentContent.content}=${joined}`;
                } else {
                  // TODO this is not covered by official tests
                  return `${segmentContent.content}${segment.ifEmpty}`;
                }
              } else {
                return joined;
              }
            } else {
              if (segment.named) {
                 if (value !== '') {
                  return `${segmentContent.content}=${this.calculateValue(value, segmentContent.sub, segment.encodeFn)}`;
                } else {
                  return `${segmentContent.content}${segment.ifEmpty}`;
                }
              } else {
                if (value !== '') {
                  return this.calculateValue(value, segmentContent.sub, segment.encodeFn);
                } else {
                  return ''
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
      return segment.first + processedPart; // replace('%%empty%%', '');
    } else if (processedPartArray.length > 0) {
      return segment.first;
    } else {
      return '';
    }
  }

  private processTemplate(): void {
    const curlyBracesRegex = /{([^}]+)}/gm;
    let matches: RegExpExecArray;
    let lastEnd = 0;
    matches = curlyBracesRegex.exec(this.template)
    while (matches) {
      if (matches.index > lastEnd) {
        const partBefore = new TemplateSegment('fix', matches.input.substring(lastEnd, matches.index));
        this.templateSegments.push(partBefore);
      }
      let part: TemplateSegment;
      if (this.uriTemplateGlobalModifiers[matches[1][0]]) {
        part = new TemplateSegment('var', matches[1].substring(1));
        const prefix = matches[1][0];
        switch (prefix) {
          case '+':
            part.encodeFn = (value: string) => this.uAndREncodeFunction(value);
            break;
          case '.':
          case '/':
            part.first = prefix;
            part.separator = prefix;
            part.encodeFn = (value: string) => this.uEncodeFunction(value);
            break;
          case ';':
            part.first = prefix;
            part.named = true;
            part.separator = prefix;
            part.encodeFn = (value: string) => this.uEncodeFunction(value);
            break;
          case '?':
            part.first = prefix;
            part.named = true;
            part.separator = '&';
            part.ifEmpty = '=';
            part.encodeFn = (value: string) => this.uEncodeFunction(value);
            break;
          case '&':
            part.first = prefix;
            part.named = true;
            part.separator = prefix;
            part.ifEmpty = '=';
            part.encodeFn = (value: string) => this.uEncodeFunction(value);
            break;
          case '#':
            part.first = prefix;
            part.encodeFn = (value: string) => this.uAndREncodeFunction(value);
            break;
        }
      } else {
        part = new TemplateSegment('var', matches[1]);
        part.encodeFn = (value: string) => this.uEncodeFunction(value);
      }
      this.templateSegments.push(part);
      lastEnd = matches.index + matches[0].length;
      matches = curlyBracesRegex.exec(this.template);
    }
    if (lastEnd < this.template.length) {
      this.templateSegments.push(new TemplateSegment('fix', this.template.substring(lastEnd)));
    }
  }

  private uEncodeFunction(value: string): string {
    return encodeURIComponent(value).replace(/!/g, "%21");
  }

  private uAndREncodeFunction(value: string): string {
    return encodeURI(value).replace(/%25[0-9][0-9]/g, (doubleEncoded: string) => '%' + doubleEncoded.substring(3));
  }

  private calculateValue(value: string, sub: number, encodeFn: encodeFn): string {
    if (sub > 0) {
      return encodeFn(value.substring(0, sub));
    } else {
      return encodeFn(value);
    }
  }

}