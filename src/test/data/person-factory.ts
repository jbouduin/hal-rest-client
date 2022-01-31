import { HostTld, IData, IFactoryResult } from "./common-definitions";
import { DataFactory } from "./data-factory";
import { UriBuilder } from "./uri-builder";

export interface IPersonFactoryResult extends IFactoryResult<IData> {
  work: IFactoryResult<IData>,
  home: IFactoryResult<IData>,
  contacts: IFactoryResult<IData>
}

export class PersonFactory extends DataFactory {

  //#region private properties ------------------------------------------------
  private readonly tld: HostTld;
  //#endregion

  //#region public properties -------------------------------------------------^
  public personsPath = 'persons';
  public myBestFriendsName = 'Lena';
  public myFathersName = 'Father';
  public myMothersName = 'Mother';
  public firstFriendsName = 'Mark';
  public secondFriendsName = 'Julia';
  public homeAddress = 'My home address';
  public workAddress = 'My work address';
  public phoneNumber = '+49 123 456 789'
  //#endregion

  //#region Constructor & C° --------------------------------------------------
  public constructor(tld: HostTld, uriBuilder: UriBuilder) {
    super(uriBuilder);
    this.tld = tld;
  }
  //#endregion

  //#region public methods ----------------------------------------------------
  public createPerson(id: number): IPersonFactoryResult {
    const result = this.createResourceData(this.tld, this.personsPath, id) as IPersonFactoryResult;
    // home
    result.home = this.createResourceData(this.tld, `${this.personsPath}/${id}/location/home`);
    result.home.data['address'] = this.homeAddress;
    // work
    result.work = this.createResourceData(this.tld, `${this.personsPath}/${id}/location/work`);
    result.work.data['address'] = this.workAddress;
    // contacts
    result.contacts = this.createResourceData(this.tld, `${this.personsPath}/${id}/contacts`);
    result.contacts.data['phone'] = this.phoneNumber;
    // fill _embedded
    result.data._embedded = {};
    let newId = id * 100;
    this.AddEmbeddedPerson(result.data._embedded, 'best-friend', newId++, this.myBestFriendsName);
    this.AddEmbeddedPerson(result.data._embedded, 'father', newId++, this.myFathersName);
    this.AddEmbeddedPerson(result.data._embedded, 'mother', newId++, this.myMothersName);
    result.data._embedded['my-friends'] = [];
    this.AddEmbeddedPerson(result.data._embedded['my-friends'], '', newId++, this.firstFriendsName);
    this.AddEmbeddedPerson(result.data._embedded['my-friends'], '', newId++, this.secondFriendsName);
    // fill _links
    this.addLinkToFactoredData(
      result.data,
      'contacts',
      this.uriBuilder.resourceUri(this.tld, false, this.personsPath, id, 'contacts'));
    this.addLinkToFactoredData(
      result.data,
      'home',
      result.home.fullUri);
    this.addLinkToFactoredData(
      result.data,
      'place-of-employment',
      result.work.fullUri);
    result.data['name'] = 'me';
    return result;
  }

  public AddEmbeddedPerson(parent: any, key: string, id: number, name: string): void {
    const result = this.createResourceData(this.tld, 'person', id).data;
    result['name'] = name;
    if (Array.isArray(parent)) {
      parent.push(result);
    } else {
      parent[key] = result;
    }
  }

  public createContacts(id: number): IFactoryResult<IData> {
    const result = this.createResourceData(this.tld, `person/${id}/contacts`);
    result.data['phone'] = '1234567890';
    return result;
  }

  //#endregion
}