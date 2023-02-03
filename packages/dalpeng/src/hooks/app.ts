import { Application } from "@dalpeng/core";
import { getThisApp, setThisApp } from "./context";
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

function withName(name: string) {
  const thisApp = getThisApp();
  if (thisApp === null) return;
  thisApp.name = name;
}
