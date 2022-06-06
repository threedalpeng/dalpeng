import type Scene from "../Scene.js";
import Component, { ComponentConstructor } from "../component/Component.js";
import Entity from "./Entity.js";

export default class GameEntity extends Entity {
  static #gameEntityList: {
    [id: number]: GameEntity;
  } = {};
  #tag = "default";

  constructor(name = "") {
    super();
    this.name = name;
    GameEntity.#gameEntityList[this.id] = this;
  }

  scene!: Scene;

  remove() {
    Object.values(Component.componentGroups).forEach((componentGroup) => {
      delete componentGroup[this.id];
    });
    delete GameEntity.#gameEntityList[this.id];
  }

  addComponent<Type extends Component>(type: ComponentConstructor<Type>): Type {
    return Component.create(type, this);
  }
  getComponent<Type extends Component>(
    type: ComponentConstructor<Type>
  ): Type | null {
    return Component.find(type, this.id)[0] ?? null;
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
    return Object.values(GameEntity.#gameEntityList).find(
      (entity) => entity.name === name
    );
  }
}
