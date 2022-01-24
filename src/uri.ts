import * as uriTemplates from "uri-templates";

export type URITemplateValues = { [key: string]: string | { [key: string]: string } }

export class URI {
    // public templates: uriTemplates.URITemplate;
    public uriTemplates;
    constructor(public uri: string, public templated: boolean = false, public fetchedURI = "") {
        if (templated) {
            this.uriTemplates = uriTemplates(uri);
        }
    }

    public get resourceURI(): string {
        if (this.templated) {
            if (this.fetchedURI != "") {
                return this.fetchedURI
            }
            throw new Error("can not call delete on resource with templated link")
        } else {
            return this.uri
        }
    }

    public fill(params: object = {}): string {
        if (this.templated && this.uriTemplates) {
            return this.uriTemplates.fill(params);
        } else {
            return this.uri;
        }
    }
    // public fill(params: URITemplateValues): string {
    //     if (this.templated && this.templates) {
    //         return this.templates.fill(params);
    //     } else {
    //         return this.uri;
    //     }
    // }
}
