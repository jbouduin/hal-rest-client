
type templatePartType = 'fix' | 'var';
type encodeFn = (value: string) => string;

class TemplateContentPart {
  public content: string;
  public explode: boolean;
  public sub: number;
  public inErrorState: boolean;

  public constructor(content: string, type: templatePartType) {
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
      console.log(result, this.content)
    }
    return result;
  }
}

class TemplatePart {
  public type: templatePartType;
  public content: Array<TemplateContentPart>;
  public first: string;
  public separator: string;
  public named: boolean;
  public ifEmpty: string;
  public encodeFn?: encodeFn;

  public get inErrorState(): boolean {
    return this.content.findIndex((part: TemplateContentPart) => part.inErrorState) >= 0;
  }

  public constructor(type: templatePartType, content: string) {
    this.type = type;
    this.content = content.split(',').map((part: string) => new TemplateContentPart(part, type));
    this.first = '';
    this.separator = ',';
    this.named = false;
    this.ifEmpty = '';
  }
}

export class UriTemplate {

  private readonly template: string;
  private readonly uriTemplateGlobalModifiers: Record<string, boolean>;
  private readonly templateParts: Array<TemplatePart>;

  public get inErrorState(): boolean {
    return this.templateParts.findIndex((part: TemplatePart) => part.inErrorState) >= 0;
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
    this.templateParts = new Array<TemplatePart>();
    this.processTemplate();
    // console.log(this.templateParts);
  }

  public fill(values: Record<string, string | Array<string>>): string | undefined {
    // console.log(this.templateParts)
    if (this.inErrorState) {
      console.log(this.inErrorState);
      return undefined;
    }

    const result = this.templateParts
      .map((part: TemplatePart) => {
        // console.log(part)
        if (part.type === 'fix') {
          return part.content[0].content;
        } else {
          return this.processPart(part, values);
        }
      })
      .join('');

    return result;

  }

  private processPart(templatePart: TemplatePart, values: Record<string, string | Array<string>>): string {
    // console.log(templatePart)
    const processedPartArray = templatePart.content
      .map((part: TemplateContentPart) => {
        const value = values[part.content];
        if (value !== null && value !== undefined) {
          if (part.explode) {
            if (Array.isArray(value)) {
              if (templatePart.named) {
                return value
                  .map((item: string) => {
                    if (item !== '') {
                      return `${part.content}=${this.calculateValue(item, part.sub, templatePart.encodeFn)}`;
                    } else {
                      return `${part.content}${templatePart.ifEmpty}`;
                    }
                  })
                  .join(templatePart.separator);
              } else {
                return value.length > 0 ?
                  value
                    .map((item: string) => this.calculateValue(item, part.sub, templatePart.encodeFn))
                    .join(templatePart.separator) :
                  undefined;
              }
            } else if (typeof value === 'object') {
              // if (templatePart.named) => not required, exploded objects are always named
              return Object.keys(value)
                .map((key: string) => {
                  if (value[key] !== '') {
                    return `${key}=${this.calculateValue(value[key], part.sub, templatePart.encodeFn)}`;
                  } else {
                    return `${key}${templatePart.ifEmpty}`;
                  }
                })
                .join(templatePart.separator);
            } else {
              // TODO is this compliant
            }
          } else {
            if (Array.isArray(value) || typeof value === 'object') {
              let joined: string;
              if (Array.isArray(value)) {
                joined = value.length > 0 ?
                  value.map((item: string) => this.calculateValue(item, part.sub, templatePart.encodeFn)).join(',') :
                  undefined;
              } else {
                joined = Object.keys(value).map((key: string) =>
                  this.calculateValue(key, part.sub, templatePart.encodeFn) + ',' +
                  this.calculateValue(value[key], part.sub, templatePart.encodeFn)).join(',');
              }
              if (templatePart.named) {
                if (joined !== '') {
                  return `${part.content}=${joined}`;
                } else {
                  return `${part.content}${templatePart.ifEmpty}`;
                }
              } else {
                return joined;
              }
            } else {
              if (templatePart.named) {
                 if (value !== '') {
                  return `${part.content}=${this.calculateValue(value, part.sub, templatePart.encodeFn)}`;
                } else {
                  return `${part.content}${templatePart.ifEmpty}`;
                }
              } else {
                if (value !== '') {
                  return this.calculateValue(value, part.sub, templatePart.encodeFn);
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
    console.log(processedPartArray);
    const processedPart = processedPartArray.join(templatePart.separator);
    if (processedPart.length > 0) {
      return templatePart.first + processedPart; // replace('%%empty%%', '');
    } else if (processedPartArray.length > 0) {
      console.log(templatePart.first)
      return templatePart.first;
    } else {
      return '';
    }
  }

  private processTemplate(): boolean {
    const curlyBracesRegex = /{([^}]+)}/gm;
    let matches: RegExpExecArray;
    let lastEnd = 0;
    while (matches = curlyBracesRegex.exec(this.template)) {
      if (matches.index > lastEnd) {
        const partBefore = new TemplatePart('fix', matches.input.substring(lastEnd, matches.index));
        this.templateParts.push(partBefore);
      }
      let part: TemplatePart;
      if (this.uriTemplateGlobalModifiers[matches[1][0]]) {
        part = new TemplatePart('var', matches[1].substring(1));
        const prefix = matches[1][0];
        switch (prefix) {
          case '+':
            part.encodeFn = this.uAndREncodeFunction;
            break;
          case '.':
          case '/':
            part.first = prefix;
            part.separator = prefix;
            part.encodeFn = this.uEncodeFunction;
            break;
          case ';':
            part.first = prefix;
            part.named = true;
            part.separator = prefix;
            part.encodeFn = this.uEncodeFunction;
            break;
          case '?':
            part.first = prefix;
            part.named = true;
            part.separator = '&';
            part.ifEmpty = '=';
            part.encodeFn = this.uEncodeFunction;
            break;
          case '&':
            part.first = prefix;
            part.named = true;
            part.separator = prefix;
            part.ifEmpty = '=';
            part.encodeFn = this.uEncodeFunction;
            break;
          case '#':
            part.first = prefix;
            part.encodeFn = this.uAndREncodeFunction;
            break;
          default:
            part.encodeFn = this.uEncodeFunction.bind(this);
            break;
        }
      } else {
        part = new TemplatePart('var', matches[1]);
        part.encodeFn = this.uEncodeFunction.bind(this);
      }
      this.templateParts.push(part);
      lastEnd = matches.index + matches[0].length;
    }
    if (lastEnd < this.template.length) {
      this.templateParts.push(new TemplatePart('fix', this.template.substring(lastEnd)));
    }
    return true;
  }

  private uEncodeFunction(value: string): string {
    return encodeURIComponent(value).replace(/!/g, "%21");
  }

  private uAndREncodeFunction(value: string): string {
    return encodeURI(value).replace(/%25[0-9][0-9]/g, (doubleEncoded: string) => '%' + doubleEncoded.substring(3));
  }

  private calculateValue(value: string, sub: number, encodeFn: encodeFn): string {
    // if (value === null) {
    //   return '%%skipme%%'
    // } else
    if (sub > 0) {
      return encodeFn(value.substring(0, sub));
    } else {
      return encodeFn(value);
    }
  }

}