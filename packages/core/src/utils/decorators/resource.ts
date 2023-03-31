export function resource<Class extends new (...args: any[]) => {}>(
  target: Class,
  { kind }: ClassDecoratorContext<Class>
) {
  if (kind !== "class") {
    throw new Error("This target is not a class");
  }

  const ResourcedTarget = class ResourcedTarget extends target {
    static #list = new Map<number, ResourcedTarget>();
    static x: string;
    name: string = "";

    constructor(...args: any[]);
    constructor(name: string, ...args: ConstructorParameters<Class>[]) {
      super(...args);
      this.name = name ?? "";
    }

    static find(name: string) {
      let toFind;
      for (let [_, target] of this.#list) {
        if (target.name === name) {
          toFind = target;
          break;
        }
      }
      return toFind;
    }
    static forEach(callback: (target: ResourcedTarget) => void) {
      this.#list.forEach(callback);
    }
  };
  return ResourcedTarget;
}
