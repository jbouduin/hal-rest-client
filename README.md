# @jbouduin/hal-rest-client

[![Travis (.com)](https://img.shields.io/travis/jbouduin/hal-rest-client)](https://travis-ci.com/github/jbouduin/hal-rest-client)
[![Coverage Status](https://coveralls.io/repos/github/jbouduin/hal-rest-client/badge.svg?branch=master)](https://coveralls.io/github/jbouduin/hal-rest-client?branch=master)

[![NPM](https://nodei.co/npm/@jbouduin/hal-rest-client.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/@jbouduin/hal-rest-client/)

The hal-rest-client library helps you to work with Hypertext Application Language (HAL) in Typescript.

This is a friendly fork of the original [hal-rest-client](https://github.com/deblockt/hal-rest-client) repository.
Reason for doing this: the original repository has been archived and is showing some severe vulnerabilities.

## What I did:
* updated the dependencies (the main reason I forked)
* switched from tslint to eslint and linted the sources (causing a lot of work and I still had to throw a few eslint-disable's in)
* switched the testing framework to jest
* avoid the use of ```any``` and ```object``` whenever possible

## What I intend to do (without the intention to invest lots of time):
* Do some more clean-up where appropriate
* Adapt and extend the library to my own needs and any changes (although not probable) in the HAL-Specification
* Correct bugs (feel free to create an issue if you find one)

## Pull requests
I am willing to merge any useful Pull Request (feel free to create them), if:
  * the change is covered by new tests
  * the implementation is compliant to the [Hal-Specification](https://datatracker.ietf.org/doc/html/draft-kelly-json-hal)
  * no unecessary dependencies are introduced
The decision to merge is taken at my own discretion.

## Install
Using npm :

```
npm install @jbouduin/hal-rest-client
```

## How to use (mostly original documentation - to be updated as there are some breaking changes)

The library provide two access method :
1. use generic object `HalResource` to map service return
2. map service return on typescript object `model`

### Generic Usage : using `HalResource`

#### Read object

To have access to your service, you need to create a hal-rest-client instance.

``` ts
import { createClient } from "hal-rest-client";

const client = createClient();
// or
const client = createClient("http://exemple.com/api");
```

To get a resource, you can use fetchResource method.

``` ts
const resource = await client.fetchResource("http://exemple.com/api/resources/5")
or
const resource = await client.fetchResource("/resources/5");
```
> fetchResource return a promise. you can use `then` and `catch` to get result.
you can get resource property, embedded property or link using `prop` method.
``` ts
const name = resource.prop("name");
const resourceURI = resource.uri;
```
for a link, on `link` service return
```ts
const link = resource.prop("link_name");
// or
const link = resource.link("link_name");
```
> link attribute type is `HalResource`

#### Follow a link

Links are made to be followed. So you can simply fetch a link using `fetch` method.
``` ts

const link = resource.link("link_name");
await link.fetch();
const name = link.prop("name");
```

Note that `link()` returns an empty `HalResource` with its `uri` set. You need to call `fetch()` to populate the HalResource.

The library also supports arrays of links using Array syntax:

```ts
const link = resource.link("link_name")[0];
await link.fetch();
const name = link.prop("name");
```

#### Follow a templated link

If you link is templated, you can set parameter to fetch to compute fetch URL.
```ts
// link "link_name" is a templated link like this
// /bookings{?projection}
const link = resource.link("link_name");
const bookings = await link.fetch(); // fetch /bookings
const bookingsWithName = await link.fetch({projection : "name"}); // fetch /bookings?projection=name
```
```ts
// link "link_infos" is like this
// /infos{/path*}
const link = resource.link("link_infos");
const infos = await link.fetch(); // fetch /infos
const infosForFoo = await link.fetch({path: "foo"});
```


#### Links as props

Note that named links are synonymous with props:

```ts
const link = resource.link("link_name");
const prop = resource.prop("link_name");
link === prop // true
```

This means you can navigate a HAL hierarchy (referencing and fetching) using props alone:

```ts
// using .prop()
const foo = await resource.prop("foo").fetch();
const bar = await foo.prop("bar").fetch();

// using .links
bar.props === resource.links.foo.links.bar.props // true
```

#### Update a resource

Resource can be updated, and saves with a PATCH query.

``` ts
resource.prop("name", "new value");
await resource.update()
```
> update return a promise. use `await` to wait end of update.

To set a link, you can use `prop` or `link` function. the new value for a link must be an `HalResource` populated or not.
``` ts
// init an HalResource called newResource
resource.prop("link_name", newResource);
await resource.update();
```
> on the request send to server, only the uri is sent not all the object.

#### Create a resource

To create a resource, you must use method `create` on your client.

``` ts
await client.create("/resources", { name: "Thomas" });
```
If your server return the new created object as body, you can do this :
``` ts
const resource = await client.create("/resources", { name: "Thomas" });
```
> Resource is an HalResource if server return a resource or just json if a simple json is returned


### With model usage

hal-rest-client can use model class to fetch HAL rest result.
Model class is a definition of service return.

#### Create a model class

for this exemple, we create a Resource model.

``` ts
import { HalProperty, HalResource } from "hal-rest-client";
import { Person } from './person.model';

class Resource extends HalResource {
  @HalProperty()
  public name;

  // for array, you must(!) specify the resource type
  @HalProperty({ resourceType: Resource})
  public subResources: Array<Resource>;

  // if name on hal-service is not the same as the  attribute name
  // you can add the hal-service property name as parameter
  @HalProperty({ name: "main-owner"})
  public owner: Person;

}
```
> your model musT extends IHalResource
>
> each property must be annoted with `@HalProperty`.
> \_links, \_embedded, an simple props must to be map with `@HalProperty`

#### Read an object

To read an object, you need to create a client, and call `fetch` method.

``` ts
import { createClient } from "hal-rest-client";

const client = createClient();
// or
const client = createClient("http://exemple.com/api");
```

call fetch method

``` ts
import { Resource } "./resource.model";
const resource = await client.fetch("/resource/5", Resource);
```
> fetch return a promise. you can use `then` and `catch` to get result. Otherwise you can use `await` see [this article](https://blog.mariusschulz.com/2016/12/09/typescript-2-1-async-await-for-es3-es5)

Read props is simply call object attributes.

``` ts
const name = resource.name;
const uri = resource.uri;
```

#### Follow a link

links are made to be followed. So you can simply fetch a link using `fetch` method.
``` ts
await resource.owner.fetch();
const ownerName = resource.owner.name;
```
> mapped links return an empty `HalResource`, just `uri` is setted. Call `fetch` populate the HalResource.
>
> if ower is not a link but an embedded resource, you don't need to call `fetch`. Object is populate with embedded resource

fetch return the fetched object, so you can do that :
``` ts
const resourceOwner = await resource.owner.fetch();
const ownerName = resourceOwner.name;
```

you can fetch a templated link like this
``` ts
// link "booking" is a templated link like this
// /bookings{?projection}
const bookings = await resource.booking.fetch(); // fetch /bookings
const bookingsWithName = await resource.booking.fetch({projection : "name"}); // fetch /bookings?projection=name
// link "infos" is like this
// /infos{/path*}
const infos = await resource.infos.fetch(); // fetch /infos
const infosForFoo = await resource.infos.fetch({path: "foo"});
```

#### update a resource

Resource can be updated, and saved with a PATCH query.

``` ts
resource.name = "new value";
await resource.update()
```
> update returns a promise. use `await` to wait end of update.

You can set a link, the new value for a link must be a `HalResource` or an other model, populated or not.
``` ts
// init an HalResource called newPerson
resource.owner = newPerson
await resource.update();
```
> when sending the request send to server, only the uri is sent, not the object complete object.

#### create a resource

To create a resource, you have two choices :
1. use `create` method on client
2. create a resource object and call `create` method on this object

##### Use the client

To create a resource, you must use method `create` on your client.

``` ts
await client.create("/resources", { name: "Thomas" });
```

If your server returns the newly created object as body, you can do this :
``` ts
const resource = await client.create("/resources", { name: "Thomas" }, Resource);
```
> Resource is a Resource object if server return a resource or just json if a simple json is returned

##### Create a new Object

To create a resource object, you must use `createResource` method

``` ts
import { createResource } from "hal-rest-client";
const resource = createResource(client, "/resources", Resource);
```

After resource creation, set properties
``` ts
resource.name = "my resource";
resource.owner = owner;
```

Call `create` method
``` ts
const createdResource = await resource.create();
```
> if your server returns a newly created object, create return this object. createdResource is of type Resource. Create doesn't populate the existing object.

## Configuration

### request configuration
You can configure some parameter on you client.
HalClient use axios to run ajax request.

You can configure each parameter describe [here](https://github.com/mzabriskie/axios#request-config)

To do, you have two solutions:

```typescript
// example to configure CORS withCredentials parameter
createClient('http://test.fr', {withCredentials : true})

// or
client.config.withCredentials = true
```

### interceptor

You can configure interceptors, you have two interceptor types :
- request interceptor : configure request information
- response interceptor: do something with server response. This interceptor is called before object parsing to HalResource

```typescript
// Add a request interceptor
halClient.interceptors.request.use(function (config) {
    // Do something before request is sent
    return config;
  }, function (error) {
    // Do something with request error
    return Promise.reject(error);
});

// Add a response interceptor
halClient.interceptors.response.use(function (response) {
    // Do something with response data
    return response;
  }, function (error) {
    // Do something with response error
    return Promise.reject(error);
});
```

## API description

### Client creation

Two parameters can be used for create a client.
- The base URI. fetchs are done with this base
- A header. All request are done with this header

a base URL can be used to fetch resources.

``` ts
import { createClient } from 'hal-rest-client';
const client = await createClient('http://foo.bar');
```

header can be set to HalRestClient
``` ts
const client = await createClient('http://foo.bar', {'headers' : {'authorization': 'Basic Auth'}});
// or
const client = createClient('http://foo.bar');
client.addHeader('authorization', 'Basic Auth');
```

When the client fetch a resource, a parser is used to convert json on HalResource.
You can customize the parsing method. To do this, you need extends JSONParser and implements your own jsonToResource method.
After, you can set the parser like this.

``` ts
client.setJsonParser(myParser);
```

### HalProperty

`HalProperty` annotation is used to map model with service body.
HalProperty have two parameters:
- name of property on service body. default it's the same name
- type. model to use for embedded or link.

``` ts
@HalProperty("property-name")
@HalProperty(Type)
@HalProperty("property-name", Type)
```

### Fetch

#### fetchResource

Fetch a service, and return an HalResource. Parameter is the URI.

``` ts
client.fetchResource('/resources/5');
// or
client.fetchResource('http://test.fr/resources/5');
```

#### fetch

Fetch a service and return a model class. Parameter is the URI and model class.
``` ts
client.fetch('/resources/5', Resource);
// or
client.fetch('http://test.fr/resources/5', Resource);
```

#### fetchArray

Fetch an array service. Return an array of object (HalResource or model class).
The service can return :
- A simple array of HAL resources
- A HAL resource containing a list of HAL resource on \_embedded

``` ts
client.fetchArray('/resources', Resource);
// or
client.fetchArray('http://test.fr/resources', Resource);
// or
client.fetchArray('http://test.fr/resources', HalResource);
```

### Create or update HAL Resource

To create or update resource, Typescript Objects are serialized on simple json to send at server.
on `create` or `update` method you can use custom JsonSerializer.

```ts
const result = await resource.update({
  parseProp : (value) => "serializer." + value,
  parseResource : (value) => "serializer2." + value.uri,
});
```

- parseProp : parse a simple property (not a HalResource)
- parseResource : parse a HalResource or model class
