import { Scene } from "@dalpeng/core";
import { getThisApp, getThisScene, setThisScene } from "./context";
import { UseGameEntity } from "./gameEntity";

export type UseScene = ReturnType<typeof defineScene>;
export function defineScene(setup: () => UseGameEntity[] | void) {
  return () => {
    const scene = new Scene();
    setThisScene(scene);

    getThisApp()?.addScene(scene);

    const rootEntites = setup() ?? [];

    rootEntites.forEach((entityFn) => {
      const entity = entityFn();
    });

    setThisScene(null);

    return scene;
  };
}

function withName(name: string) {
  const thisScene = getThisScene();
  if (thisScene === null) return;
  thisScene.name = name;
}
