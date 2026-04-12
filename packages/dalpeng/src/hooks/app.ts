import {
  Application,
  GameEntity,
  Materializer,
  Scene,
  Transform,
  type CanvasOptions,
  type GameInstance,
  type Layer,
  type MaterializerHooks,
  type ProjectionContext,
  type RenderConfig,
} from "@dalpeng/core";
import { domUIRenderer } from "@dalpeng/ui";
import { requireApp, setParentEntity, setThisApp, setThisEntity, setThisScene } from "../context";
import type { UseScene } from "./scene";

type FeatureListener = (newVal: any, oldVal: any) => void;

export interface ReactiveFeatures {
  features: RenderConfig;
  watch(key: string, cb: FeatureListener): () => void;
}

function createReactiveFeatures(initial: RenderConfig): ReactiveFeatures {
  const listeners = new Map<string, Set<FeatureListener>>();
  const features = new Proxy(initial, {
    set(target, prop: string, value) {
      const oldVal = (target as any)[prop];
      if (value === oldVal) return true;
      (target as any)[prop] = value;
      const cbs = listeners.get(prop);
      if (cbs) {
        cbs.forEach((cb) => cb(value, oldVal));
      }
      return true;
    },
  });
  function watch(key: string, cb: FeatureListener): () => void {
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    listeners.get(key)!.add(cb);
    return () => {
      const set = listeners.get(key);
      if (set) {
        set.delete(cb);
        if (set.size === 0) listeners.delete(key);
      }
    };
  }
  return { features, watch };
}

export type UseApp = ReturnType<typeof defineApp>;
export function defineApp(setup: () => UseScene | undefined) {
  return () => {
    const app = new Application();
    setThisApp(app);
    try {
      const sceneFn = setup();
      sceneFn?.();
    } finally {
      setThisApp(null);
    }
    return app;
  };
}

export function withCanvasOptions(options: CanvasOptions) {
  const app = requireApp("withCanvasOptions");
  app.setCanvasOptions(options);
}

export function withFeatures(features: Partial<RenderConfig>) {
  const app = requireApp("withFeatures");
  Object.assign(app.features, features);
}

/**
 * Declare the app's layer set inside `defineApp` setup.
 *
 * Rules:
 *   - Call exactly once. A second call throws.
 *   - Layer names must be unique.
 *   - Backends must be arranged as `[...canvas, ...dom]` — the browser cannot
 *     interleave DOM between canvas content.
 *
 * Omitting `withLayers` is fine — the registry starts with default layers
 * (`world` canvas+y-sort, `hud` dom+insertion).
 */
export function withLayers(layers: readonly Layer[]) {
  const app = requireApp("withLayers");
  app.layers.declareUser(layers);
}

export interface AppRunOptions extends CanvasOptions {
  features?: Partial<RenderConfig>;
}

function makeMaterializerHooks(app: Application): MaterializerHooks {
  return {
    createGameEntity(parent) {
      const entity = new GameEntity();
      if (parent instanceof Scene) {
        parent.addEntity(entity);
      } else {
        (parent as GameInstance).entity.addChild(entity);
      }
      entity.addComponent(Transform);
      return entity;
    },

    pushGameContext(entity, parent) {
      const prevParent = parent instanceof Scene ? null : (parent as GameInstance).entity;
      setThisEntity(entity);
      setParentEntity(prevParent);
      const scene = entity.scene;
      if (scene) setThisScene(scene);
      return () => {
        setThisEntity(null);
        setParentEntity(null);
        setThisScene(null);
      };
    },

    buildProjectionContext(_owner): ProjectionContext {
      const getCanvas = (): HTMLCanvasElement => {
        const c = app.canvasController.canvas as HTMLCanvasElement | null;
        if (!c) throw new Error("buildProjectionContext: canvas not available (call after runOn)");
        return c;
      };
      return {
        doc: document,
        get canvas() {
          return getCanvas();
        },
        viewport() {
          const c = getCanvas();
          const r = c.getBoundingClientRect();
          return { x: r.left, y: r.top, width: r.width, height: r.height };
        },
        onCanvasResize(cb) {
          const c = getCanvas();
          const ro = new ResizeObserver(cb);
          ro.observe(c);
          return () => ro.disconnect();
        },
        features: app.features as unknown as Record<string, unknown>,
        watchFeature(key, cb) {
          return app.watchFeature ? app.watchFeature(key, cb) : () => {};
        },
        layers: app.layers,
        onDispose(cb) {
          app.onDispose(cb);
        },
      };
    },
  };
}

export async function runApp(
  useApp: UseApp,
  target: HTMLCanvasElement | string,
  options?: AppRunOptions
) {
  const app = useApp();

  const { features, watch } = createReactiveFeatures(app.features);
  app.features = features;
  app.watchFeature = watch;

  if (options?.features) {
    Object.assign(app.features, options.features);
  }
  await app.runOn(target, options);

  app.registerUIRenderer(domUIRenderer);

  const materializer = new Materializer(app, makeMaterializerHooks(app));
  app.registerMaterializer(materializer);

  for (const scene of app.scenes) {
    const pending = scene._pendingRootDescriptors;
    if (pending.length === 0) continue;
    scene._pendingRootDescriptors = [];
    materializer.materializeRoots(scene, pending);
  }

  return app;
}
