import Component, { ComponentConstructor } from "../component/Component.js";
import type Scene from "../Scene.js";
import Entity from "./Entity.js";

export default class GameEntity extends Entity {
  static #gameEntityList = new Map<number, GameEntity>();
  #tag = "default";

  constructor(name = "") {
    super();
    this.name = name;
    GameEntity.#gameEntityList.set(this.id, this);
  }

  scene!: Scene;
  #parent: GameEntity | null = null;
  get parent() {
    return this.#parent;
  }

  #children: GameEntity[] = [];
  get children() {
    return this.#children;
  }

  addChild(child: GameEntity) {
    this.#children.push(child);
    child.#parent = this;
    child.scene = this.scene;
  }

  remove() {
    Component.componentGroups.forEach((componentGroup) => {
      componentGroup.delete(this.id);
    });
    GameEntity.#gameEntityList.delete(this.id);
  }

  addComponent<Type extends Component>(type: ComponentConstructor<Type>): Type {
    return Component.create(type, this);
  }
  getComponent<Type extends Component>(
    type: ComponentConstructor<Type>
  ): Type | null {
    const components = Component.find(type, this.id);
    if (components) {
      return components[0] ?? null;
    } else {
      return null;
    }
  }
  getComponents<Type extends Component>(
    type: ComponentConstructor<Type>
  ): Type[] {
    return Component.find(type, this.id) ?? [];
  }

  get tag() {
    return this.#tag;
  }
  set tag(tag) {
    this.#tag = tag;
    // TODO: add to tag map
  }

  get currentApp() {
    return this.scene.app;
  }

  static find(name: string) {
    let toFind;
    for (let [_, entity] of GameEntity.#gameEntityList) {
      if (entity.name === name) {
        toFind = entity;
        break;
      }
    }
    return toFind;
  }
}
