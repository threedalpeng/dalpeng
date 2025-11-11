import { Application, type CanvasOptions } from "@dalpeng/core";
import { getThisApp, setThisApp } from "./context";
import type { UseScene } from "./scene";

export type UseApp = ReturnType<typeof defineApp>;
export function defineApp(setup: () => UseScene | undefined) {
  return () => {
    const app = new Application();
    setThisApp(app);

    const sceneFn = setup();
    if (sceneFn) {
      sceneFn();
    }
    setThisApp(null);

    return app;
  };
}

export function withCanvasOptions(options: CanvasOptions) {
  const app = getThisApp();
  app?.setCanvasOptions(options);
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
