import { HalProperty, HalResource } from '../..';

import { Contacts } from './contacts';
import { Location } from './location';

export class Person extends HalResource {
  @HalProperty()
  public name;

  @HalProperty({ name: 'my-friends', resourceType: Person })
  public myFriends: Array<Person>;

  public mother: any;
  @HalProperty({ resourceType: Person })

  @HalProperty({ resourceType: Person })
  public father: any;

  @HalProperty()
  public contacts: Contacts;

  @HalProperty({ name: 'best-friend' })
  public bestFriend: Person;

  @HalProperty({ resourceType: Location })
  public home: Location;

  @HalProperty({ name: 'place-of-employment', resourceType: Location })
  public work: Location;
}
