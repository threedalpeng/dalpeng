import { createDispatcher, type Dispatcher, type EventMap } from "../runtime/dispatcher";
import type { EntityInstance } from "../runtime/Instance";
import type Scene from "../Scene.js";
import Component, { type ComponentConstructor } from "./Component.js";
import Entity from "./Entity.js";
import Transform from "./Transform";

/**
 * Event shape carried by `GameEntity.emit/.on`. Extend by declaration merge:
 *
 *     declare module "@dalpeng/core" {
 *       interface GameEntityEventMap {
 *         hit: [amount: number];
 *       }
 *     }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GameEntityEventMap extends EventMap {}

export default class GameEntity extends Entity {
  static #gameEntityList = new Map<number, GameEntity>();
  #tag = "default";
  /** Per-entity component storage, keyed by constructor reference (not class name). */
  #componentsByType = new Map<ComponentConstructor<Component>, Component[]>();
  /** Lazily allocated — most entities never emit, so we save the per-entity overhead. */
  #events: Dispatcher<GameEntityEventMap> | null = null;

  constructor(name = "") {
    super();
    this.name = name;
    GameEntity.#gameEntityList.set(this.id, this);
  }

  _gameInstance: EntityInstance | null = null;
  _layerName: string | undefined = undefined;

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
    if (child === this) return this;
    child.detach();
    this.#children.push(child);
    child.#parent = this;
    if (this.scene !== undefined) {
      child.scene = this.scene;
      this.scene?._attachEntityHierarchy(child);
    }
    child.getComponent(Transform)?.markDirty();
    return this;
  }

  removeChild(child: GameEntity) {
    const idx = this.#children.indexOf(child);
    if (idx >= 0) {
      this.#children.splice(idx, 1);
      if (child.#parent === this) child.#parent = null;
    }
    return this;
  }

  detach() {
    if (this.#parent) {
      this.scene?._detachEntityHierarchy(this);
      this.#parent.removeChild(this);
      this.#parent = null;
    } else if (this.scene) {
      this.scene.removeEntity(this);
    }
    this.getComponent(Transform)?.markDirty();
    return this;
  }

  remove() {
    [...this.#children].forEach((child) => child.remove());
    this.detach();
    for (const components of this.#componentsByType.values()) {
      for (const c of components) {
        c.isActive = false;
        try {
          c.dispose();
        } catch (err) {
          console.error(`[core] ${c.constructor.name}.dispose() threw:`, err);
        }
      }
    }
    this.#componentsByType.clear();
    this.#events?.clear();
    this.#events = null;
    GameEntity.#gameEntityList.delete(this.id);
  }

  // Event bus — entity-scoped, typed via GameEntityEventMap declaration merge.
  // Cross-entity subscription: `other.on("hit", cb)`. No automatic bubbling —
  // parent does not receive child events; pattern that explicitly via the
  // sender's emit + a parent-side subscription. Listeners registered inside
  // an active scope auto-cleanup with the scope.

  on<K extends keyof GameEntityEventMap>(
    event: K,
    callback: (...args: GameEntityEventMap[K]) => void
  ): () => void {
    if (!this.#events) this.#events = createDispatcher<GameEntityEventMap>();
    return this.#events.on(event, callback);
  }

  once<K extends keyof GameEntityEventMap>(
    event: K,
    callback: (...args: GameEntityEventMap[K]) => void
  ): () => void {
    if (!this.#events) this.#events = createDispatcher<GameEntityEventMap>();
    return this.#events.once(event, callback);
  }

  off<K extends keyof GameEntityEventMap>(
    event: K,
    callback: (...args: GameEntityEventMap[K]) => void
  ): void {
    this.#events?.off(event, callback);
  }

  emit<K extends keyof GameEntityEventMap>(event: K, ...args: GameEntityEventMap[K]): void {
    this.#events?.emit(event, ...args);
  }

  addComponent<Type extends Component>(type: ComponentConstructor<Type>): Type {
    return Component.create(type, this);
  }

  getComponent<Type extends Component>(type: ComponentConstructor<Type>): Type | null {
    const components = this.#componentsByType.get(type as ComponentConstructor<Component>) as
      | Type[]
      | undefined;
    return components?.[0] ?? null;
  }

  getComponents<Type extends Component>(type: ComponentConstructor<Type>): Type[] {
    return (
      (this.#componentsByType.get(type as ComponentConstructor<Component>) as Type[] | undefined) ??
      []
    );
  }

  getAllComponents(): Component[] {
    const result: Component[] = [];
    for (const components of this.#componentsByType.values()) {
      result.push(...components);
    }
    return result;
  }

  get tag() {
    return this.#tag;
  }
  set tag(tag) {
    if (this.#tag === tag) return;
    const prev = this.#tag;
    this.#tag = tag;
    this.scene?._updateEntityTag(this, prev, tag);
  }

  get currentApp() {
    return this.scene.app;
  }

  _registerComponentInstance<Type extends Component>(
    type: ComponentConstructor<Type>,
    component: Type
  ) {
    const key = type as ComponentConstructor<Component>;
    let components = this.#componentsByType.get(key);
    if (components === undefined) {
      components = [];
      this.#componentsByType.set(key, components);
    }
    components.push(component);
  }

  _unregisterComponentInstance<Type extends Component>(
    type: ComponentConstructor<Type>,
    component: Type
  ) {
    const key = type as ComponentConstructor<Component>;
    const components = this.#componentsByType.get(key);
    if (!components) return;
    const idx = components.indexOf(component);
    if (idx >= 0) {
      components.splice(idx, 1);
      if (components.length === 0) this.#componentsByType.delete(key);
    }
  }

  static find(name: string): GameEntity | undefined {
    for (const entity of GameEntity.#gameEntityList.values()) {
      if (entity.name === name) return entity;
    }
    return undefined;
  }
}
