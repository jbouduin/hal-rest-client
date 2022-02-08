import 'reflect-metadata';
import { IHalResource, IHalResourceConstructor, INewable } from './hal-resource.interface';

/**
 * get or create the MetaData
 *
 * @param metaDataKey
 * @param target
 * @returns
 */
function getOrCreateMetaData(metaDataKey: string, target: object): object {

  let result = Reflect.getMetadata(metaDataKey, target);
  if (result === undefined) {
    result = {};
    Reflect.defineMetadata(metaDataKey, result, target);
  }
  return result;
}

export function HalProperty<T extends IHalResource>(

  { name, resourceType }: { name?: string; resourceType?: IHalResourceConstructor<T> | INewable } =  { }):
  (targetHalResource: object, propertyName: string) => void {

  return (targetHalResource: object, propertyName: string) => {
    const baseType = Reflect.getMetadata('design:type', targetHalResource, propertyName);

    if (baseType === Array && resourceType === undefined) {
      throw new Error(`${targetHalResource.constructor.name}.${propertyName} for Array you need to specify a resource type on @HalProperty.`);
    }

    const workwith = resourceType || baseType;
    let isHalResource = false;
    if (workwith) {
      const proto = workwith.prototype;
      let proto2 = Object.getPrototypeOf(proto);
      while (proto2 && !isHalResource) {
        isHalResource = proto2.constructor.name === 'HalResource';
        proto2 = Object.getPrototypeOf(proto2);
      }
    }

    const halToTs = getOrCreateMetaData('halClient:halToTs', targetHalResource);
    const tsToHal = getOrCreateMetaData('halClient:tsToHal', targetHalResource);
    const isHal = getOrCreateMetaData('halClient:isHal', targetHalResource);

    halToTs[name || propertyName] = propertyName;
    isHal[name || propertyName] = isHalResource;
    tsToHal[propertyName] = name || propertyName;
    const type = resourceType || baseType;
    Reflect.defineMetadata('halClient:specificType', type, targetHalResource, propertyName);
    if (name && resourceType) {
      Reflect.defineMetadata('halClient:specificType', type, targetHalResource, name);
    }

    // Delete existing property and replace it by the get and set methods of HalResource
    if (delete targetHalResource[propertyName]) {
      // Create new property with getter and setter
      Object.defineProperty(targetHalResource, propertyName, {
        get() { return this.getProp(propertyName); },
        set(value) { this.setProp(propertyName, value); },
        configurable: true,
        enumerable: true,
      });
    }
  };
}

