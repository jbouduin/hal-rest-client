import { HalProperty, HalResource } from "../..";
import { NotificationConfig } from "./notification-config";

export class HalNotification extends HalResource {
  @HalProperty()
  public cellphoneSet: boolean;

  @HalProperty({ resourceType: NotificationConfig })
  public nonEmbeddedArray: Array<NotificationConfig>;

  @HalProperty({ resourceType: NotificationConfig })
  public nonEmbeddedObject: NotificationConfig;

  @HalProperty()
  public embeddedObject: NotificationConfig;

  @HalProperty({ resourceType: NotificationConfig })
  public embeddedArray: Array<NotificationConfig>;
}
