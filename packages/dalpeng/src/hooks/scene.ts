import { Scene } from "@dalpeng/core";
import { getThisApp, setThisScene } from "./context";
import type { UseGameEntity } from "./gameEntity";

export type UseScene = ReturnType<typeof defineScene>;
export function defineScene(setup: () => UseGameEntity[] | void) {
  return () => {
    const scene = new Scene();
    setThisScene(scene);

    getThisApp()?.addScene(scene);

    const rootEntites = setup() ?? [];

    rootEntites.forEach((entityFn) => {
      entityFn();
    });

    setThisScene(null);

    return scene;
  };
}
