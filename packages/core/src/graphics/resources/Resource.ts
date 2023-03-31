import Entity from "@/entity/Entity";

export type ResourceConstructor<Type extends Resource> = new (
  ...args: any[]
) => Type;
type ResourceMap<Type extends Resource> = Map<string, Type[]>;
type ResourceMaps = Map<
  ResourceConstructor<Resource>["name"],
  ResourceMap<Resource>
>;
export class Resource extends Entity {
  name: string = "";
  constructor(name: string = "") {
    super();
    this.name = name;
  }

  static resourceMaps: ResourceMaps = new Map<
    ResourceConstructor<Resource>["name"],
    ResourceMap<Resource>
  >();
  resourceMap!: ResourceMap<Resource>;
  static create<Type extends Resource>(
    type: ResourceConstructor<Type>,
    name: string = ""
  ) {
    const resource = new type(name);
    let resourceMap: ResourceMap<Type> | undefined = this.resourceMaps.get(
      type.name
    ) as ResourceMap<Type>;
    if (resourceMap === undefined) {
      resourceMap = new Map<string, Type[]>();
      this.resourceMaps.set(type.name, resourceMap);
    }
    resource.resourceMap = resourceMap;

    let resources: Type[] | undefined = resourceMap.get(name);
    if (resources === undefined) {
      resources = [];
      resourceMap.set(name, resources);
    }
    resources.push(resource);

    return resource;
  }
}
