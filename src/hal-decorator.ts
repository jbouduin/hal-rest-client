import 'reflect-metadata';
import { HalResource } from './hal-resource';
import { IHalResourceConstructor, INewable } from './hal-resource-interface';

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

export function HalProperty<T extends HalResource>(

  { name: halPropertyName, targetType, isHalResource }: { name?: string; targetType?: IHalResourceConstructor<T> | INewable; isHalResource?: boolean } =  { }):
  (targetHalResource: object, propertyName: string) => void {

  return (targetHalResource: object, propertyName: string) => {
    const baseType = Reflect.getMetadata('design:type', targetHalResource, propertyName);

    if (baseType === Array && targetType === undefined) {
      throw new Error(`${targetHalResource.constructor.name}.${propertyName} for Array you need to specify a resource type on @HalProperty.`);
    }

    if (isHalResource == undefined) {
      isHalResource = true;
    }
    const halToTs = getOrCreateMetaData('halClient:halToTs', targetHalResource);
    const tsToHal = getOrCreateMetaData('halClient:tsToHal', targetHalResource);
    const isHal = getOrCreateMetaData('halClient:isHal', targetHalResource);

    halToTs[halPropertyName || propertyName] = propertyName;
    isHal[halPropertyName || propertyName] = isHalResource;
    tsToHal[propertyName] = halPropertyName || propertyName;
    const type = targetType || baseType;
    Reflect.defineMetadata('halClient:specificType', type, targetHalResource, propertyName);
    if (halPropertyName && targetType) {
      Reflect.defineMetadata('halClient:specificType', type, targetHalResource, halPropertyName);
    }

    // Delete property.
    // TODO 1663 refactor HalResource prop(name: string, value?: any)
    if (delete targetHalResource[propertyName]) {
      // Create new property with getter and setter
      Object.defineProperty(targetHalResource, propertyName, {
        get() { return this.prop(propertyName); },
        set(value) { this.prop(propertyName, value); },
        configurable: true,
        enumerable: true,
      });
    }
  };
}

