import { Vec3 } from "@dalpeng/math";
import type Application from "./Application";
import Transform from "./Transform";
import type GameEntity from "./entity/GameEntity";

export default class Scene {
  // Scene identity
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

  // Application binding
  #app!: Application;
  get app() {
    return this.#app;
  }
  set app(app: Application) {
    this.#app = app;
  }

  // Entity registry
  rootEntities: { [key: number]: GameEntity } = {};
  #entities = new Set<GameEntity>();
  #tagMap = new Map<string, Set<GameEntity>>();

  // Public entity management
  addEntity(entity: GameEntity) {
    entity.detach();
    entity.scene = this;
    this.rootEntities[entity.id] = entity;
    this._attachEntityHierarchy(entity);
    return this;
  }

  removeEntity(entity: GameEntity) {
    delete this.rootEntities[entity.id];
    this._detachEntityHierarchy(entity);
    return this;
  }

  // Query APIs
  findByTag(tag: string) {
    return Array.from(this.#tagMap.get(tag) ?? []);
  }

  queryRadius(center: Vec3, radius: number) {
    const results: GameEntity[] = [];
    const radiusSq = radius * radius;
    this.#entities.forEach((entity) => {
      const transform = entity.getComponent(Transform);
      if (!transform) return;
      const pos = transform.worldPosition;
      const dx = pos.x - center.x;
      const dy = pos.y - center.y;
      const dz = pos.z - center.z;
      if (dx * dx + dy * dy + dz * dz <= radiusSq) {
        results.push(entity);
      }
    });
    return results;
  }

  // Internal helpers
  _attachEntityHierarchy(entity: GameEntity) {
    const stack: GameEntity[] = [entity];
    while (stack.length) {
      const current = stack.pop()!;
      if (current.scene !== this) {
        current.scene = this;
      }
      if (!this.#entities.has(current)) {
        this.#entities.add(current);
        this.#addTagEntry(current.tag, current);
      }
      for (const child of current.children) {
        child.scene = this;
        stack.push(child);
      }
    }
  }

  _detachEntityHierarchy(entity: GameEntity) {
    const stack: GameEntity[] = [entity];
    while (stack.length) {
      const current = stack.pop()!;
      if (this.#entities.delete(current)) {
        this.#removeTagEntry(current.tag, current);
      }
      stack.push(...current.children);
    }
  }

  _updateEntityTag(entity: GameEntity, oldTag: string, newTag: string) {
    if (this.#entities.has(entity)) {
      this.#removeTagEntry(oldTag, entity);
      this.#addTagEntry(newTag, entity);
    }
  }

  #addTagEntry(tag: string, entity: GameEntity) {
    let set = this.#tagMap.get(tag);
    if (set === undefined) {
      set = new Set<GameEntity>();
      this.#tagMap.set(tag, set);
    }
    set.add(entity);
  }

  #removeTagEntry(tag: string, entity: GameEntity) {
    const set = this.#tagMap.get(tag);
    if (!set) return;
    set.delete(entity);
    if (set.size === 0) {
      this.#tagMap.delete(tag);
    }
  }
}
