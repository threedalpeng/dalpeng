import { Vec3 } from "@dalpeng/math";
import type Application from "./Application";
import type { AppNode } from "./AppNode";
import type GameEntity from "./ecs/GameEntity";
import Transform from "./ecs/Transform";
import { createDispatcher } from "./runtime/dispatcher";
import { computed, ref, type ReadonlyRef } from "./runtime/flow";

export default class Scene {
  static #nextId = 0;
  #id = 0;
  get id() {
    return this.#id;
  }

  name = "";
  events = createDispatcher();

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

  _pendingRootDescriptors: AppNode[] = [];

  #entities = new Set<GameEntity>();
  #tagMap = new Map<string, Set<GameEntity>>();

  #entityVersion = ref(0);
  entitiesRef: ReadonlyRef<readonly GameEntity[]> = computed(() => {
    void this.#entityVersion.value;
    return Array.from(this.#entities);
  });

  /**
   * Iterate root-level entities (no parent). Filtered live from the unified
   * `#entities` set — no separate book-keeping to drift out of sync.
   */
  *rootEntities(): IterableIterator<GameEntity> {
    for (const e of this.#entities) {
      if (e.parent === null) yield e;
    }
  }

  addEntity(entity: GameEntity) {
    entity.detach();
    entity.scene = this;
    this._attachEntityHierarchy(entity);
    return this;
  }

  removeEntity(entity: GameEntity) {
    this._detachEntityHierarchy(entity);
    return this;
  }

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

  _attachEntityHierarchy(entity: GameEntity) {
    const stack: GameEntity[] = [entity];
    let added = false;
    while (stack.length) {
      const current = stack.pop()!;
      if (current.scene !== this) {
        current.scene = this;
      }
      if (!this.#entities.has(current)) {
        this.#entities.add(current);
        this.#addTagEntry(current.tag, current);
        added = true;
      }
      for (const child of current.children) {
        child.scene = this;
        stack.push(child);
      }
    }
    if (added) this.#entityVersion.value++;
  }

  _detachEntityHierarchy(entity: GameEntity) {
    const stack: GameEntity[] = [entity];
    let removed = false;
    while (stack.length) {
      const current = stack.pop()!;
      if (this.#entities.delete(current)) {
        this.#removeTagEntry(current.tag, current);
        removed = true;
      }
      stack.push(...current.children);
    }
    if (removed) this.#entityVersion.value++;
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
