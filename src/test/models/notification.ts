import { HalProperty, HalResource } from "../..";
import { NotificationConfig } from "./notification-config";

export class HalNotification extends HalResource {
  @HalProperty()
  public cellphoneSet: boolean;

  @HalProperty(NotificationConfig)
  public notificationConfigs: Array<NotificationConfig>;
}