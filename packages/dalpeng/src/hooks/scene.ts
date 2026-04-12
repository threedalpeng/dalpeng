import { Scene, type AppNode } from "@dalpeng/core";
import { getThisApp, setThisScene } from "../context";

export type UseScene = ReturnType<typeof defineScene>;

export function defineScene(setup: () => readonly AppNode[] | void) {
  return (): Scene => {
    const scene = new Scene();
    setThisScene(scene);
    try {
      getThisApp()?.addScene(scene);
      scene._pendingRootDescriptors = [...(setup() ?? [])] as any;
      return scene;
    } finally {
      setThisScene(null);
    }
  };
}
