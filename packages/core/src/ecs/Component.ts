import EventEmitter, { type EventMap } from "../utils/EventEmitter";
import Entity from "./Entity.js";
import type GameEntity from "./GameEntity.js";

export type ComponentConstructor<Type extends Component> = new (gameEntity: GameEntity) => Type;

/**
 * Base component event shape. Subclasses can narrow via declaration merge
 * or a more specific emitter type — but for the vast majority of code the
 * loose string/any-args shape is what Script / dalpeng hooks rely on.
 */
export type ComponentEventMap = EventMap;

export default class Component extends Entity {
  #gameEntity: GameEntity;
  #isActive: boolean = true;

  constructor(gameEntity: GameEntity) {
    super();
    this.#gameEntity = gameEntity;
  }

  #isSetup: boolean = false;
  setup() {
    this.#isSetup = true;
  }

  /**
   * Release GPU/IO resources held by this component.
   * Called during `GameEntity.remove()` and `Application.dispose()`.
   * Subclasses override to dispose VAOs, VBOs, textures, event listeners, etc.
   */
  dispose(): void {}

  static create<Type extends Component>(
    type: ComponentConstructor<Type>,
    gameEntity: GameEntity,
    isActive = true
  ): Type {
    const component = new type(gameEntity);
    gameEntity._registerComponentInstance(type, component);

    // isActive setter short-circuits when old === new, so register directly here.
    // setup() is intentionally deferred — callers (e.g. useMesh) must assign
    // fields like `renderer.mesh` before setup runs.
    if (isActive) {
      const app = gameEntity.scene?.app;
      if (app) app._registerActive(type, component);
    } else {
      component.#isActive = false;
    }

    return component;
  }

  get gameEntity() {
    return this.#gameEntity;
  }
  get currentScene() {
    return this.#gameEntity.scene;
  }
  get currentApp() {
    return this.#gameEntity.scene.app;
  }

  get isActive() {
    return this.#isActive;
  }
  set isActive(active) {
    if (this.#isActive === active) return;
    this.#isActive = active;
    const app = this.#gameEntity.scene?.app;
    const ctor = this.constructor as ComponentConstructor<this>;
    if (active) {
      if (!this.#isSetup) this.setup();
      if (app) app._registerActive(ctor, this);
    } else {
      if (app) app._unregisterActive(ctor, this);
    }
  }

  getComponent<Type extends Component>(type: ComponentConstructor<Type>): Type | null {
    return this.#gameEntity.getComponent<Type>(type);
  }

  #emitter = new EventEmitter<ComponentEventMap>();

  on<K extends keyof ComponentEventMap>(
    event: K,
    callback: (...args: ComponentEventMap[K]) => void
  ): () => void {
    return this.#emitter.on(event, callback);
  }

  once<K extends keyof ComponentEventMap>(
    event: K,
    callback: (...args: ComponentEventMap[K]) => void
  ): () => void {
    return this.#emitter.once(event, callback);
  }

  off<K extends keyof ComponentEventMap>(
    event: K,
    callback: (...args: ComponentEventMap[K]) => void
  ): void {
    this.#emitter.off(event, callback);
  }

  emit<K extends keyof ComponentEventMap>(event: K, ...data: ComponentEventMap[K]): void {
    this.#emitter.emit(event, ...data);
  }
}
