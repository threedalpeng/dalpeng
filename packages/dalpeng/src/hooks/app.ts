import { Application, type CanvasOptions, type RenderConfig } from "@dalpeng/core";
import { requireApp, setThisApp } from "../context";
import type { UseScene } from "./scene";

// ── Reactive Features ──────────────────────────────────────────────────────

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

// ── App Hooks ───────────────────────────────────────────────────────────────

export type UseApp = ReturnType<typeof defineApp>;
export function defineApp(setup: () => UseScene | undefined) {
  return () => {
    const app = new Application();
    setThisApp(app);
    try {
      const sceneFn = setup();
      if (sceneFn) sceneFn();
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

/** Set render features inside defineApp() setup. */
export function withFeatures(features: Partial<RenderConfig>) {
  const app = requireApp("withFeatures");
  Object.assign(app.features, features);
}

export interface AppRunOptions extends CanvasOptions {
  features?: Partial<RenderConfig>;
}

export async function runApp(
  useApp: UseApp,
  target: HTMLCanvasElement | string,
  options?: AppRunOptions
) {
  const app = useApp();

  // Wrap features in reactive proxy
  const { features, watch } = createReactiveFeatures(app.features);
  app.features = features;
  app.watchFeature = watch;

  if (options?.features) {
    Object.assign(app.features, options.features);
  }
  await app.runOn(target, options);
  return app;
}
