import Entity from "../entity/Entity.js";
import type GameEntity from "../entity/GameEntity.js";
import { isNil } from "../utils/basic.js";

// ─── Component Base Class ─────────────────────────────────────────────────────
// Provides lifecycle, activation, and ECS wiring for concrete components.

export type ComponentConstructor<Type extends Component> = new (
  gameEntity: GameEntity
) => Type;
type ComponentGroup<Type extends Component> = Map<number, Type[]>;
type ComponentGroups = Map<
  ComponentConstructor<Component>["name"],
  ComponentGroup<Component>
>;
type ComponentEventCallback = (...data: any[]) => void;
export default class Component extends Entity {
  // ─── Instance Context ──────────────────────────────────────────────────────
  // Captures the owning entity and activation flags for this component.
  #gameEntity: GameEntity;
  #isActive: boolean = true;
  componentGroup!: ComponentGroup<Component>;
  constructor(gameEntity: GameEntity) {
    super();
    this.#gameEntity = gameEntity;
  }

  #isSetup: boolean = false;
  setup() {
    this.#isSetup = true;
  }

  // ─── Static Registry ───────────────────────────────────────────────────────
  // Global mapping from component types to their entity-specific instances.
  static componentGroups: ComponentGroups = new Map<
    ComponentConstructor<Component>["name"],
    ComponentGroup<Component>
  >();
  static create<Type extends Component>(
    type: ComponentConstructor<Type>,
    gameEntity: GameEntity,
    isActive = true
  ) {
    const component = new type(gameEntity);
    let componentGroup: ComponentGroup<Type> | undefined =
      this.componentGroups.get(type.name) as ComponentGroup<Type>;
    if (componentGroup === undefined) {
      componentGroup = new Map<number, Type[]>();
      this.componentGroups.set(type.name, componentGroup);
    }
    component.componentGroup = componentGroup;

    let components: Type[] | undefined = componentGroup.get(gameEntity.id);
    if (components === undefined) {
      components = [];
      componentGroup.set(gameEntity.id, components);
    }
    components.push(component);
    gameEntity._registerComponentInstance(component);

    component.isActive = isActive;
    if (isActive) {
      const app = gameEntity.scene?.app;
      if (app) {
        let components = app.activeComponents.get(type.name) as
          | Set<Type>
          | undefined;
        if (components === undefined) {
          components = new Set<Type>();
          app.activeComponents.set(type.name, components);
        }
        components.add(component);
      }
    }

    component.on("run", (key: keyof Type) => {
      if (key in component && typeof component[key] === "function") {
        (component[key] as unknown as () => void)();
      }
    });

    return component;
  }

  // ─── Registry Queries ──────────────────────────────────────────────────────
  // Helper for retrieving components either globally or per-entity.
  static find<Type extends Component>(
    type: ComponentConstructor<Type>
  ): ComponentGroup<Type> | null;
  static find<Type extends Component>(
    type: ComponentConstructor<Type>,
    gameEntityId: number
  ): Type[] | null;
  static find<Type extends Component>(
    type: ComponentConstructor<Type>,
    gameEntityId?: number
  ): ComponentGroup<Type> | Type[] | null {
    const componentGroup = this.componentGroups.get(
      type.name
    ) as ComponentGroup<Type>;
    if (isNil(componentGroup)) {
      return null;
    } else {
      if (gameEntityId === undefined) {
        return componentGroup;
      }
      return (componentGroup.get(gameEntityId) ?? []) as Type[];
    }
  }

  // ─── Context Shortcuts ─────────────────────────────────────────────────────
  // Convenience getters to access owning scene or application.
  get gameEntity() {
    return this.#gameEntity;
  }
  get currentScene() {
    return this.#gameEntity.scene;
  }
  get currentApp() {
    return this.#gameEntity.scene.app;
  }

  // ─── Activation Control ────────────────────────────────────────────────────
  // Publishes components to Application active sets and handles teardown.
  get isActive() {
    return this.#isActive;
  }
  set isActive(active) {
    if (this.#isActive !== active) {
      this.#isActive = active;
      if (active) {
        if (!this.#isSetup) {
          this.setup();
        }
        const app = this.gameEntity.scene?.app;
        if (app) {
          let components = app.activeComponents.get(this.constructor.name) as
            | Set<this>
            | undefined;
          if (components === undefined) {
            components = new Set<this>();
            app.activeComponents.set(this.constructor.name, components);
          }
          components.add(this);
        }
      } else {
        const app = this.gameEntity.scene?.app;
        const components = app?.activeComponents.get(this.constructor.name) as
          | Set<this>
          | undefined;
        components?.delete(this);
      }
    }
  }

  getComponent<Type extends Component>(
    type: ComponentConstructor<Type>
  ): Type | null {
    return this.#gameEntity.getComponent<Type>(type);
  }

  // ─── Event Hooks ───────────────────────────────────────────────────────────
  // Lightweight event emitter for intra-component communication.
  #callbacks: { [event: string]: ComponentEventCallback[] } = {};
  on(event: string, callback: ComponentEventCallback) {
    this.#callbacks = this.#callbacks || {};
    (this.#callbacks[event] = this.#callbacks[event] || []).push(callback);
    return this;
  }
  emit(event: string, ...data: any[]) {
    this.#callbacks = this.#callbacks || {};

    const args = data.slice(0);
    let callbacks = this.#callbacks[event];

    if (callbacks) {
      callbacks = callbacks.slice(0);
      for (let i = 0, len = callbacks.length; i < len; ++i) {
        callbacks[i].apply(this, args);
      }
    }

    return this;
  }
}
