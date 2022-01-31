import { HostTld, IData, IFactoryResult, ILink, ILinkCollection, IListData, IQueryParameters } from "./common-definitions";
import { DataFactory } from "./data-factory";
import { UriBuilder } from "./uri-builder";

export class ProjectFactory extends DataFactory {
  //#region private properties ------------------------------------------------
  private readonly tld: HostTld;
  //#endregion

  //#region public properties -------------------------------------------------
  public readonly projectsPath: string;
  //#endregion

  //#region Constructor & C° --------------------------------------------------
  public constructor(tld: HostTld, uriBuilder: UriBuilder) {
    super(uriBuilder);
    this.tld = tld;
    this.projectsPath = 'projects';
  }
  //#endregion

  //#region public methods ----------------------------------------------------
  public createProject(id: number): IFactoryResult<IData> {
    const children = new Array<ILink>();
    for (let i = id + 1; i <= id + 3; i++) {
        children.push({ href: this.uriBuilder.resourceUri(this.tld, false, this.projectsPath, i) });
    }
    const links: ILinkCollection = {
      children: children,
      parent: { href: this.uriBuilder.resourceUri(this.tld, false, this.projectsPath, id + 4) },
      versions: this.uriBuilder.resourceUri(this.tld, false, this.projectsPath, id, 'versions')
    };

    const result = this.createResourceData(
      this.tld,
      this.projectsPath,
      id,
      undefined,
      links);
    result.data['name'] = `Project ${id}`;
    return result;
  }

  public createRootProjectList(): IFactoryResult<IData> {
    const result = this.createProjectList(0);
    result.relativeUri = this.uriBuilder.resourceUri(this.tld, true, this.projectsPath);
    result.fullUri = this.uriBuilder.resourceUri(this.tld, false, this.projectsPath);
    result.data._links['self'] = this.uriBuilder.resourceUri(this.tld, false, this.projectsPath);
    return result;
  }

  public createProjectList(offset: number): IFactoryResult<IData> {
    const queryParameters: IQueryParameters = {
      offset: offset,
      sort: 'LastModified',
      pageSize: 20,
    };

    const changeSizeLink = this.uriBuilder.filledTemplatedResourceUri(
      this.tld,
      false,
      this.projectsPath,
      {
        offset: offset,
        sort: 'LastModified',
        pageSize: '{pageSize}'
      }
    );

    const jumpToLink = this.uriBuilder.filledTemplatedResourceUri(
      this.tld,
      false,
      this.projectsPath,
      {
        offset: '{jumpTo}',
        sort: 'LastModified',
        pageSize: 20
      }
    );

    const templatedLink = this.uriBuilder.templatedResourceUri(
      this.tld,
      false,
      this.projectsPath,
      {
        offset: '{jumpTo}',
        sort: 'LastModified',
        pageSize: 20
      }
    );

    const listData: IListData = {
      listKey: 'results',
      listData: [
        this.createProject(offset * 10).data,
        this.createProject((offset * 10) + 10).data
      ],
      queryParameters: queryParameters
    };

    const links: ILinkCollection = {
      changeSize: {
        href: changeSizeLink,
        templated: true
      },
      jumpTo: {
        href: jumpToLink,
        templated: true
      },
      templated: {
        href: templatedLink,
        templated: true
      }
    };

    const result = this.createResourceListData(this.tld, this.projectsPath, listData, links);
    return result;
  }
  //#endregion
}