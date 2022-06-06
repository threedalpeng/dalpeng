import type Application from "./Application";
import type GameEntity from "./entity/GameEntity";

export default class Scene {
  static #nextId = 0;
  #id = 0;
  get id() {
    return this.#id;
  }

  name = "";
  constructor(name: string = "") {
    this.#id = Scene.#nextId++;
    this.name = name;
  }

  #app!: Application;
  get app() {
    return this.#app;
  }
  set app(app: Application) {
    this.#app = app;
  }

  rootEntities: { [key: number]: GameEntity } = {};

  addEntity(entity: GameEntity) {
    entity.scene = this;
    this.rootEntities[entity.id] = entity;
    return this;
  }

  removeEntity(entity: GameEntity) {
    delete this.rootEntities[entity.id];
    return this;
  }
}
