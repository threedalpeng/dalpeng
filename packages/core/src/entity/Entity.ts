export default class Entity {
  static #nextId = 0;
  #id = 0;
  name = "";
  get id() {
    return this.#id;
  }
  constructor() {
    this.#id = Entity.#nextId++;
  }
}
