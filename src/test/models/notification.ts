import { HalProperty, HalResource } from "../..";
import { NotificationConfig } from "./notification-config";

export class HalNotification extends HalResource {
  @HalProperty()
  public cellphoneSet: boolean;

  @HalProperty({ resourceType: NotificationConfig, isHalResource: false })
  public notificationConfigs: Array<NotificationConfig>;

  @HalProperty({ resourceType: NotificationConfig, isHalResource: false })
  public lastNotificationConfig: NotificationConfig;
}