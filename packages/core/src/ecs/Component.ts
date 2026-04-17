import Entity from "./Entity.js";
import type GameEntity from "./GameEntity.js";

export type ComponentConstructor<Type extends Component> = new (gameEntity: GameEntity) => Type;

type ComponentEventCallback = (...data: any[]) => void;

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

    // Initial active-registration: setter short-circuits when old === new,
    // so force the side-effect once here for freshly-created components.
    if (isActive) {
      if (!component.#isSetup) component.setup();
      const app = gameEntity.scene?.app;
      if (app) app._registerActive(type, component);
    } else {
      component.#isActive = false;
    }

    component.on("run", (key: keyof Type) => {
      if (key in component && typeof component[key] === "function") {
        (component[key] as unknown as () => void)();
      }
    });

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

  #callbacks: { [event: string]: ComponentEventCallback[] } = {};
  on(event: string, callback: ComponentEventCallback) {
    (this.#callbacks[event] = this.#callbacks[event] || []).push(callback);
    return this;
  }
  emit(event: string, ...data: any[]) {
    const callbacks = this.#callbacks[event];
    if (!callbacks) return this;
    const snapshot = callbacks.slice();
    for (let i = 0; i < snapshot.length; i++) {
      snapshot[i].apply(this, data);
    }
    return this;
  }
}
