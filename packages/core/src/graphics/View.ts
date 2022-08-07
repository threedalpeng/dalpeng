import type Application from "@/Application";

export default class View {
  static #nextId = 0;
  #id = 0;
  get id() {
    return this.#id;
  }

  name = "";
  constructor(name: string = "") {
    this.#id = View.#nextId++;
    this.name = name;
  }

  #app!: Application;
  get app() {
    return this.#app;
  }
  set app(app: Application) {
    this.#app = app;
  }
}
