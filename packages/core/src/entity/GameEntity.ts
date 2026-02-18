import Component, { type ComponentConstructor } from "../component/Component.js";
import type Scene from "../Scene.js";
import Transform from "../Transform";
import Entity from "./Entity.js";

export default class GameEntity extends Entity {
  // ─── Static Registry ───────────────────────────────────────────────────────
  // Keeps global references and per-entity component caches.
  static #gameEntityList = new Map<number, GameEntity>();
  #tag = "default";
  #componentsByType = new Map<string, Component[]>();

  constructor(name = "") {
    super();
    this.name = name;
    GameEntity.#gameEntityList.set(this.id, this);
  }

  // ─── Hierarchy State ───────────────────────────────────────────────────────
  // Tracks scene membership, parent pointers, and child entities.
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
    if (child === this) {
      return this;
    }
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
      if (child.#parent === this) {
        child.#parent = null;
      }
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
    Component.componentGroups.forEach((componentGroup) => {
      componentGroup.delete(this.id);
    });
    GameEntity.#gameEntityList.delete(this.id);
  }

  addComponent<Type extends Component>(type: ComponentConstructor<Type>): Type {
    return Component.create(type, this);
  }

  // ─── Component Lookup ───────────────────────────────────────────────────────
  // Cached component accessors keyed by constructor name.
  getComponent<Type extends Component>(type: ComponentConstructor<Type>): Type | null {
    const components = this.#componentsByType.get(type.name) as Type[] | undefined;
    return components?.[0] ?? null;
  }
  getComponents<Type extends Component>(type: ComponentConstructor<Type>): Type[] {
    return (this.#componentsByType.get(type.name) as Type[] | undefined) ?? [];
  }
  getAllComponents(): Component[] {
    const result: Component[] = [];
    for (const components of this.#componentsByType.values()) {
      result.push(...components);
    }
    return result;
  }

  // ─── Tag State ─────────────────────────────────────────────────────────────
  // Keeps the current tag and syncs with the owning scene's tag map.
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

  // ─── Component Registry Hooks ──────────────────────────────────────────────
  // Internal helpers invoked by Component to maintain per-entity caches.
  _registerComponentInstance(component: Component) {
    const typeName = component.constructor.name;
    let components = this.#componentsByType.get(typeName);
    if (components === undefined) {
      components = [];
      this.#componentsByType.set(typeName, components);
    }
    components.push(component);
  }

  _unregisterComponentInstance(component: Component) {
    const typeName = component.constructor.name;
    const components = this.#componentsByType.get(typeName);
    if (!components) return;
    const idx = components.indexOf(component);
    if (idx >= 0) {
      components.splice(idx, 1);
      if (components.length === 0) {
        this.#componentsByType.delete(typeName);
      }
    }
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
