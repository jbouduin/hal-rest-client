import "reflect-metadata";
import { HalResource } from "./hal-resource";
import { IHalResourceConstructor } from "./hal-resource-interface";

/**
 * get the transco decorator
 */
function getHalClientDecorator(transconame: string, target: any): object {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  let transco = Reflect.getMetadata("halClient:" + transconame, target);
  if (transco === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    transco = {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    Reflect.defineMetadata("halClient:" + transconame, transco, target);
  }
  return transco;
}

export function HalProperty<T extends HalResource>(
  // eslint-disable-next-line @typescript-eslint/ban-types
  { name, resourceType, isHalResource }: { name?: string; resourceType?: IHalResourceConstructor<T> | Function; isHalResource?: boolean } =  { }):
  (target: any, key: string) => void {

  return (target: any, key: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const baseType = Reflect.getMetadata("design:type", target, key);
    if (baseType === Array && resourceType === undefined) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`${target.constructor.name}.${key} for Array you need to specify a resource type on @HalProperty.`);
    }

    if (isHalResource == undefined) {
      isHalResource = true;
    }
    const halToTs = getHalClientDecorator("halToTs", target);
    const tsToHal = getHalClientDecorator("tsToHal", target);
    const isHal = getHalClientDecorator("isHal", target);

    halToTs[name || key] = key;
    isHal[name || key] = isHalResource;
    tsToHal[key] = name || key;
    const type = resourceType || baseType;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    Reflect.defineMetadata("halClient:specificType", type, target, key);
    if (name && resourceType) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      Reflect.defineMetadata("halClient:specificType", type, target, name);
    }

    // Delete property.
    if (delete target[key]) {
      // Create new property with getter and setter
      Object.defineProperty(target, key, {
        get() { return this.prop(key); },
        set(value) { this.prop(key, value); },
        configurable: true,
        enumerable: true,
      });
    }
  };
}

