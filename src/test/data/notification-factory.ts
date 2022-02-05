import { HostTld, IData, IEmbeddedCollection, IFactoryResult, ILinkCollection } from "./common-definitions";
import { DataFactory } from "./data-factory";
import { UriBuilder } from "./uri-builder";

export type lookFor = 'nonEmbeddedArray' | 'embeddedArray' | 'embeddedObject' | 'nonEmbeddedObject';

export class NotificationFactory extends DataFactory {

  //#region private properties ------------------------------------------------
  private readonly tld: HostTld;
  private readonly path: string;
  //#endregion

  public readonly nonEmbeddedArray = 'nonEmbeddedArray';
  public readonly embeddedArray = 'embeddedArray';
  public readonly embeddedObject = 'embeddedObject';
  public readonly nonEmbeddedObject = 'nonEmbeddedObject';

  public readonly categoryValues: Record<lookFor, string>;
  public readonly descriptionValues: Record<lookFor, string>;
  public readonly emailEnabledValues: Record<lookFor, boolean>;
  public readonly emailIdValues: Record<lookFor, number>;
  public readonly subCategoryValues: Record<lookFor, string>;

  //#region Constructor & C° --------------------------------------------------
  public constructor(tld: HostTld, uriBuilder: UriBuilder, path: string) {
    super(uriBuilder);
    this.tld = tld;
    this.path = path;
    this.categoryValues = this.initializeCategoryValues();

    this.descriptionValues = this.initializeDescriptionValues();
    this.emailEnabledValues = this.initializeEmailEnabledValues();
    this.emailIdValues = this.initializeEmailIdValues();
    this.subCategoryValues = this.initializeSubCategoryValues();
  }
  //#endregion


  public createNotification(): IFactoryResult<IData> {
    const links: ILinkCollection = {
      updateNotificationConfigs: {
        href: this.uriBuilder.resourceUri(this.tld, false, this.path, undefined, 'update'),
        type: 'application/hal+json',
      }
    };

    const data: IEmbeddedCollection = {};
    data[this.embeddedObject] = this.createNotificationConfig('embeddedObject');
    data[this.embeddedArray] = [this.createNotificationConfig('embeddedArray')];

    const result = this.createResourceData(this.tld, this.path, undefined, data, links);
    result.data['cellphoneSet'] = false;
    result.data[this.nonEmbeddedObject] = this.createNotificationConfig('nonEmbeddedObject');
    result.data[this.nonEmbeddedArray] = [this.createNotificationConfig('nonEmbeddedArray')];

    return result;
  }

  private createNotificationConfig(which: lookFor): Record<string, unknown> {
    return {
      category: this.categoryValues[which],
      email: {
        enabled: this.emailEnabledValues[which],
        id: this.emailIdValues[which],
      },
      notificationDescription: this.descriptionValues[which],
      subcategory: this.subCategoryValues[which]
    };
  }

  private initializeEmailIdValues(): Record<lookFor, number> {
    return {
      embeddedArray: 10,
      embeddedObject: 11,
      nonEmbeddedArray: 15,
      nonEmbeddedObject: 21
    };
  }

  private initializeEmailEnabledValues(): Record<lookFor, boolean> {
    return {
      embeddedArray: true,
      embeddedObject: false,
      nonEmbeddedArray: true,
      nonEmbeddedObject: false
    };
  }

  private initializePropertyNames(): Record<lookFor, string> {
    return {
      embeddedArray: 'embeddedArray',
      embeddedObject: 'embeddedObject',
      nonEmbeddedArray: 'nonEmbeddedArray',
      nonEmbeddedObject: 'nonEmbeddedObject'
    };
  }

  private initializeCategoryValues(): Record<lookFor, string> {
    return {
      embeddedArray: 'Mail',
      embeddedObject: 'Coffee',
      nonEmbeddedArray: 'Mail',
      nonEmbeddedObject: 'Coffee'
    };
  }

  private initializeSubCategoryValues(): Record<lookFor, string> {
    return {
      embeddedArray: 'Mail_Received',
      embeddedObject: 'Coffe_Machine',
      nonEmbeddedArray: 'Mail_Bounced',
      nonEmbeddedObject: 'Coffee_Machine'
    };
  }

  private initializeDescriptionValues(): Record<lookFor, string> {
    return {
      embeddedArray: 'You\'ve got mail',
      embeddedObject: 'Machine needs cleaning',
      nonEmbeddedArray: 'Mail could not be delivered',
      nonEmbeddedObject: 'Out of milk'
    };
  }


}