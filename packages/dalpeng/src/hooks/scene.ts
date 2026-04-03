import { Scene } from "@dalpeng/core";
import { getThisApp, setThisScene } from "../context";
import type { UseGameEntity } from "./gameEntity";

export type UseScene = ReturnType<typeof defineScene>;
export function defineScene(setup: () => UseGameEntity[] | void) {
  return () => {
    const scene = new Scene();
    setThisScene(scene);
    try {
      getThisApp()?.addScene(scene);
      const rootEntities = setup() ?? [];
      rootEntities.forEach((entityFn) => entityFn());
    } finally {
      setThisScene(null);
    }
    return scene;
  };
}
