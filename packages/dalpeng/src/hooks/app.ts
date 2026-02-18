import { Application, type CanvasOptions } from "@dalpeng/core";
import { requireApp, setThisApp } from "./context";
import type { UseScene } from "./scene";

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

export async function runApp(
  useApp: UseApp,
  target: HTMLCanvasElement | string,
  options?: CanvasOptions
) {
  const app = useApp();
  await app.runOn(target, options);
  return app;
}
