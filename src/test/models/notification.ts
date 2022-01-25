import { HalProperty, HalResource } from "../..";
import { NotificationConfig } from "./notification-config";

export class HalNotification extends HalResource {
  @HalProperty()
  public cellphoneSet: boolean;

  @HalProperty({ resourceType: NotificationConfig})
  public notificationConfigs: Array<NotificationConfig>;
}