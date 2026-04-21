import Application from "../Application";
import GameEntity from "../ecs/GameEntity";
import type { LogicalDescriptor } from "../runtime/Descriptor";
import { INSTANCE_KIND, type EntityInstance, type UIInstance } from "../runtime/Instance";
import { Materializer, type MaterializerHooks } from "../runtime/Materializer";
import type { UIRenderer } from "../runtime/UIRenderer";
import Scene from "../Scene";

export interface SceneRunner {
  readonly app: Application;
  readonly scene: Scene;

  /** Advance `n` frames (default 1) with a fixed `dtMs` per step (default 16). */
  step(n?: number, dtMs?: number): void;

  find(name: string): GameEntity | null;
  findByTag(tag: string): GameEntity[];
  destroy(): void;
}

export function makeNoopUIRenderer(): UIRenderer & { instances: UIInstance[] } {
  const instances: UIInstance[] = [];
  return {
    instances,
    materialize(descriptor, _context, owner) {
      try {
        (descriptor as { setup: (p: unknown) => unknown }).setup(
          (descriptor as { props: unknown }).props
        );
      } catch {
        // intentional: invariant tests may throw in setup
      }
      let detached = false;
      const instance: UIInstance = {
        [INSTANCE_KIND]: "ui",
        descriptor,
        owner,
        rendererState: {
          get isDetached() {
            return detached;
          },
        },
        detach() {
          detached = true;
        },
      };
      instances.push(instance);
      return instance;
    },
  };
}

function makeCoreHooks(app: Application): MaterializerHooks {
  return {
    createGameEntity(parent) {
      const entity = new GameEntity();
      if (parent instanceof Scene) {
        parent.addEntity(entity);
      } else {
        (parent as EntityInstance).entity.addChild(entity);
      }
      return entity;
    },
    pushGameContext() {
      return () => {};
    },
    buildProjectionContext() {
      return {
        doc: globalThis.document ?? ({} as Document),
        canvas: null as unknown as HTMLCanvasElement,
        viewport: () => ({ x: 0, y: 0, width: 0, height: 0 }),
        onCanvasResize: () => () => {},
        features: app.features as unknown as Record<string, unknown>,
        watchFeature: app.watchFeature ?? (() => () => {}),
        layers: app.layers,
        onDispose: () => {},
      };
    },
  };
}

export interface TestSceneOptions {
  uiRenderer?: UIRenderer;
  hooks?: (app: Application) => MaterializerHooks;
}

export function testScene(
  rootDescriptors: readonly LogicalDescriptor[],
  opts: TestSceneOptions = {}
): SceneRunner {
  const app = new Application();
  const scene = new Scene();
  app.addScene(scene);

  const uiRenderer = opts.uiRenderer ?? makeNoopUIRenderer();
  app.registerUIRenderer(uiRenderer);

  const hooks = (opts.hooks ?? makeCoreHooks)(app);
  const materializer = new Materializer(app, hooks);
  app.registerMaterializer(materializer);

  materializer.materializeRoots(scene, rootDescriptors as LogicalDescriptor[]);

  app._testSetup();

  return {
    app,
    scene,
    step(n = 1, dtMs = 16) {
      for (let i = 0; i < n; i++) app._testStep(dtMs, { skipRender: true });
    },
    find(name) {
      return scene.findByName(name);
    },
    findByTag(tag) {
      return scene.findByTag(tag);
    },
    destroy() {
      app.dispose();
    },
  };
}
