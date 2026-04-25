import {
  Application,
  GameEntity,
  Materializer,
  Scene,
  Transform,
  type CanvasOptions,
  type EntityInstance,
  type Layer,
  type LogicalDescriptor,
  type MaterializerHooks,
  type ProjectionContext,
  type RenderConfig,
} from "@dalpeng/core";
import { domUIRenderer } from "@dalpeng/ui";
import { pushScope, requireApp } from "../context";
import type { UseScene } from "./scene";

export type UseApp = ReturnType<typeof defineApp>;
export function defineApp(setup: () => UseScene | undefined) {
  return () => {
    const app = new Application();
    const popScope = pushScope({ app });
    try {
      const sceneFn = setup();
      sceneFn?.();
    } finally {
      popScope();
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
  app.configure(features);
}

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
        (parent as EntityInstance).entity.addChild(entity);
      }
      entity.addComponent(Transform);
      return entity;
    },

    pushGameContext(entity, parent) {
      const prevParent = parent instanceof Scene ? null : (parent as EntityInstance).entity;
      return pushScope({
        entity,
        parent: prevParent,
        scene: entity.scene ?? null,
      });
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
          const r = app.features[key as keyof RenderConfig] as
            | { subscribe(cb: (n: unknown, o: unknown) => void): () => void }
            | undefined;
          return r ? r.subscribe(cb) : () => {};
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

  if (options?.features) {
    app.configure(options.features);
  }
  await app.runOn(target, options);

  app.registerUIRenderer(domUIRenderer);

  const materializer = new Materializer(app, makeMaterializerHooks(app));
  app.registerMaterializer(materializer);

  for (const scene of app.scenes) {
    const pending = scene._pendingRootDescriptors;
    if (pending.length === 0) continue;
    scene._pendingRootDescriptors = [];
    materializer.materializeRoots(scene, pending as unknown as LogicalDescriptor[]);
  }

  return app;
}
