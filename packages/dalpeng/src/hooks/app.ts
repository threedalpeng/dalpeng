import { Application } from "@dalpeng/core";
import { setThisApp } from "./context";
import { UseScene } from "./scene";

export type UseApp = ReturnType<typeof defineApp>;
export function defineApp(setup: () => UseScene | undefined) {
  return () => {
    const app = new Application();
    setThisApp(app);

    const sceneFn = setup();
    if (sceneFn) {
      const scene = sceneFn();
    }
    setThisApp(null);

    return app;
  };
}
