import { HalProperty, HalResource } from '../..';

import { Contacts } from './contacts';
import { Location } from './location';

export class Person extends HalResource {
  @HalProperty()
  public name;

  @HalProperty({ name: 'my-friends', targetType: Person })
  public myFriends: Array<Person>;

  @HalProperty({ targetType: Person })
  public mother: any;

  @HalProperty()
  public father: Person;

  @HalProperty()
  public contacts: Contacts;

  @HalProperty({ name: 'best-friend' })
  public bestFriend: Person;

  @HalProperty({ targetType: Location })
  public home: Location;

  @HalProperty({ name: 'place-of-employment', targetType: Location })
  public work: Location;
}
