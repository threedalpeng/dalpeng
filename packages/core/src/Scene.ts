import { Vec3 } from "@dalpeng/math";
import type Application from "./Application";
import Transform from "./ecs/Transform";
import type GameEntity from "./ecs/GameEntity";

export default class Scene {
  // ─── Scene Identity ────────────────────────────────────────────────────────
  // Assigns a unique id and friendly name to each scene instance.
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

  // ─── Application Binding ────────────────────────────────────────────────────
  // Tracks which Application currently owns this scene.
  #app!: Application;
  get app() {
    return this.#app;
  }
  set app(app: Application) {
    this.#app = app;
  }

  // ─── Entity Registry ────────────────────────────────────────────────────────
  // Keeps root entities plus flattened sets for tags and spatial queries.
  rootEntities: { [key: number]: GameEntity } = {};
  #entities = new Set<GameEntity>();
  #tagMap = new Map<string, Set<GameEntity>>();

  // ─── Entity Management API ──────────────────────────────────────────────────
  // Public helpers for injecting and ejecting entity hierarchies.
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

  // ─── Query APIs ─────────────────────────────────────────────────────────────
  // Provide tag lookups and simple proximity queries over scene entities.
  findByTag(tag: string) {
    return Array.from(this.#tagMap.get(tag) ?? []);
  }

  findByName(name: string): GameEntity | null {
    for (const entity of this.#entities) {
      if (entity.name === name) return entity;
    }
    return null;
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

  // ─── Internal Helpers ───────────────────────────────────────────────────────
  // Scene-private hooks used by GameEntity to keep registries in sync.
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
