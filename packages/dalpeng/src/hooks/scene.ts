import { Scene, type AppNode } from "@dalpeng/core";
import { getThisApp, pushScope } from "../context";

export type UseScene = ReturnType<typeof defineScene>;

export function defineScene(setup: () => readonly AppNode[] | void) {
  return (): Scene => {
    const scene = new Scene();
    const popScope = pushScope({ scene });
    try {
      getThisApp()?.addScene(scene);
      scene._pendingRootDescriptors = [...(setup() ?? [])];
      return scene;
    } finally {
      popScope();
    }
  };
}
