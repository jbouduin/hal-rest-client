import "reflect-metadata";
import { IHalResource, IHalResourceConstructor, INewable } from "./hal-resource.interface";

/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/* eslint-disable  @typescript-eslint/no-unsafe-assignment */
/**
 * The parameter for HalProperty
 */
export type IHalPropertyOptions<T extends IHalResource> = {
  /**
   * @type {string} - the property name as found in the hal+json
   */
  name?: string;
  /**
   * @template T - a class having the HalResource construcor signature
   * @type {IHalResourceConstructor<T> | INewable} - the type of class the data should be mapped to. It must be a class with a HalResource constructor signature or with a parameterless constructor.
   */
  resourceType?: IHalResourceConstructor<T> | INewable;
};

/**
 * get or create the MetaData
 *
 * @param {string} metaDataKey - the key of the metadata
 * @param {object} target - the object for which to get or create the metadata
 * @returns {object} - the newly created or existing metadata
 */
function getOrCreateMetaData(metaDataKey: string, target: object): object {
  let result = Reflect.getMetadata(metaDataKey, target);
  if (result === undefined) {
    result = {};
    Reflect.defineMetadata(metaDataKey, result, target);
  }
  return result;
}

/**
 * @template T - a IHalResource extender
 * @param {IHalPropertyOptions} options - the {@link IHalPropertyOptions} for the property
 * @returns {Function} -
 */
export function HalProperty<T extends IHalResource>(
  options: IHalPropertyOptions<T> = {}):
  (targetHalResource: object, propertyName: string) => void {
  return (targetHalResource: object, propertyName: string) => {
    const baseType = Reflect.getMetadata("design:type", targetHalResource, propertyName);

    if (baseType === Array && options.resourceType === undefined) {
      throw new Error(`${targetHalResource.constructor.name}.${propertyName} for Array you need to specify a resource type on @HalProperty.`);
    }

    const workwith = options.resourceType || baseType;
    let isHalResource = false;
    if (workwith) {
      const proto = workwith.prototype;
      let proto2 = Object.getPrototypeOf(proto);
      while (proto2 && !isHalResource) {
        isHalResource = proto2.constructor.name === "HalResource";
        proto2 = Object.getPrototypeOf(proto2);
      }
    }

    const halToTs = getOrCreateMetaData("halClient:halToTs", targetHalResource);
    const tsToHal = getOrCreateMetaData("halClient:tsToHal", targetHalResource);
    const isHal = getOrCreateMetaData("halClient:isHal", targetHalResource);

    halToTs[options.name || propertyName] = propertyName;
    isHal[options.name || propertyName] = isHalResource;
    tsToHal[propertyName] = options.name || propertyName;
    const type = options.resourceType || baseType;
    Reflect.defineMetadata("halClient:specificType", type, targetHalResource, propertyName);
    if (options.name && options.resourceType) {
      Reflect.defineMetadata("halClient:specificType", type, targetHalResource, options.name);
    }

    // Delete existing property and replace it by the get and set methods of HalResource
    if (delete targetHalResource[propertyName]) {
      // Create new property with getter and setter
      Object.defineProperty(targetHalResource, propertyName, {
        get() { return this.getProperty(propertyName); },
        set(value) { this.setProperty(propertyName, value); },
        configurable: true,
        enumerable: true,
      });
    }
  };
}
