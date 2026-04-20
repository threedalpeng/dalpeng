import type Application from "../Application";
import type Scene from "../Scene";
import type GameEntity from "../ecs/GameEntity";
import {
  isGameDescriptor,
  isUIDescriptor,
  type GameDescriptor,
  type LogicalDescriptor,
  type UIDescriptor,
} from "./Descriptor";
import { INSTANCE_KIND, type EntityInstance, type UIInstance } from "./Instance";
import type { ProjectionContext } from "./ProjectionContext";

export interface MaterializerHooks {
  createGameEntity(parent: EntityInstance | Scene): GameEntity;
  pushGameContext(entity: GameEntity, parent: EntityInstance | Scene): () => void;
  buildProjectionContext(owner: EntityInstance | Scene): ProjectionContext;
}

export class Materializer {
  readonly #app: Application;
  readonly #hooks: MaterializerHooks;

  constructor(app: Application, hooks: MaterializerHooks) {
    this.#app = app;
    this.#hooks = hooks;
  }

  materializeRoots(
    scene: Scene,
    rootDescriptors: readonly LogicalDescriptor[]
  ): { gameInstances: EntityInstance[]; uiInstances: UIInstance[] } {
    const gameInstances: EntityInstance[] = [];
    const uiInstances: UIInstance[] = [];
    for (const descriptor of rootDescriptors) {
      const result = this.materialize(descriptor, scene);
      if (result[INSTANCE_KIND] === "game") {
        gameInstances.push(result as EntityInstance);
      } else {
        uiInstances.push(result as UIInstance);
      }
    }
    return { gameInstances, uiInstances };
  }

  materialize(
    descriptor: LogicalDescriptor,
    parent: EntityInstance | Scene
  ): EntityInstance | UIInstance {
    if (isGameDescriptor(descriptor)) {
      return this.#materializeGame(descriptor, parent);
    }
    if (isUIDescriptor(descriptor)) {
      return this.#materializeUI(descriptor, parent);
    }
    throw new Error(
      `Materializer: unknown descriptor kind. Expected game or ui, got ${JSON.stringify(descriptor)}`
    );
  }

  #materializeGame(descriptor: GameDescriptor, parent: EntityInstance | Scene): EntityInstance {
    const entity = this.#hooks.createGameEntity(parent);

    const instance: EntityInstance = {
      [INSTANCE_KIND]: "game",
      descriptor,
      entity,
      owner: parent,
      gameChildren: [],
      uiChildren: [],
    };

    entity._gameInstance = instance;

    const popContext = this.#hooks.pushGameContext(entity, parent);

    let childDescriptors: readonly LogicalDescriptor[] | void;
    try {
      childDescriptors = descriptor.setup(descriptor.props);
    } finally {
      popContext();
    }

    if (childDescriptors) {
      for (const childDescriptor of childDescriptors) {
        const childInstance = this.materialize(childDescriptor, instance);
        if (childInstance[INSTANCE_KIND] === "game") {
          instance.gameChildren.push(childInstance as EntityInstance);
        } else {
          instance.uiChildren.push(childInstance as UIInstance);
        }
      }
    }

    return instance;
  }

  #materializeUI(descriptor: UIDescriptor, parent: EntityInstance | Scene): UIInstance {
    const renderer = this.#app.getUIRenderer();
    if (!renderer) {
      throw new Error(
        "Materializer: no UI renderer registered for this Application. " +
          "Call `app.registerUIRenderer(domUIRenderer)` before materialising " +
          "any UI descriptor. The dalpeng `runApp` wrapper does this " +
          "automatically; standalone Application users must register manually."
      );
    }

    const context = this.#hooks.buildProjectionContext(parent);
    return renderer.materialize(descriptor, context, parent);
  }

  /** DFS teardown: detaches owned UI children first, then calls runOnDestroy. Component teardown is the caller's responsibility. */
  /**
   * Push the dalpeng-layer entity context (so `useEntity()`, `spawn()`, etc.
   * work inside onStart/onDestroy callbacks). Returns a pop function.
   * Unlike the materialize-time push, this is for runtime lifecycle hooks
   * where the parent arg is whatever the entity currently resolves to.
   */
  pushEntityContext(entity: GameEntity): () => void {
    const parentInstance = entity.parent?._gameInstance;
    const scene = entity.scene;
    const parent = parentInstance ?? scene;
    if (!parent) return () => {};
    return this.#hooks.pushGameContext(entity, parent);
  }

  destroyCascade(instance: EntityInstance, runOnDestroy: (e: GameEntity) => void): void {
    for (const child of instance.gameChildren) {
      this.destroyCascade(child, runOnDestroy);
    }

    for (const uiChild of instance.uiChildren) {
      try {
        uiChild.detach();
      } catch (err) {
        console.error("Materializer: UI detach failed during cascade", err);
      }
    }
    instance.uiChildren.length = 0;

    runOnDestroy(instance.entity);
  }
}
