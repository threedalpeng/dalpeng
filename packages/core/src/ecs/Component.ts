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

    // Initial active-registration: the isActive setter short-circuits when
    // old === new (default #isActive = true), so perform the registration
    // side-effect directly here. Note: we do NOT call setup() — subclasses
    // like MeshRenderer need `renderer.mesh = ...` to be assigned by the
    // caller (e.g., useMesh) before setup runs. Setup is fired later by
    // Application.#setup() at app start, or by #setupEntitySubtree after
    // a runtime spawn. See feedback_self_review_runtime_paths.md.
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

  // Events are delegated to a shared EventEmitter primitive so Scene /
  // Component / (future) Entity bus all share the same typed, off-supporting
  // surface. Historically Component rolled its own raw-array callbacks with
  // no unsubscribe and no `off`; that duplication is the root S1 issue.
  #emitter = new EventEmitter<ComponentEventMap>();

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends keyof ComponentEventMap>(
    event: K,
    callback: (...args: ComponentEventMap[K]) => void
  ): () => void {
    return this.#emitter.on(event, callback);
  }

  /** Subscribe once and auto-unsubscribe on first fire. */
  once<K extends keyof ComponentEventMap>(
    event: K,
    callback: (...args: ComponentEventMap[K]) => void
  ): () => void {
    return this.#emitter.once(event, callback);
  }

  /** Remove a specific callback for `event`. */
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
