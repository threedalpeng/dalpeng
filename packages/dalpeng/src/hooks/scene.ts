import { Scene, type LogicalDescriptor } from "@dalpeng/core";
import { getThisApp, setThisScene } from "../context";

export type UseScene = ReturnType<typeof defineScene>;

export function defineScene(setup: () => readonly LogicalDescriptor[] | void) {
  return (): Scene => {
    const scene = new Scene();
    setThisScene(scene);
    try {
      getThisApp()?.addScene(scene);
      scene._pendingRootDescriptors = [...(setup() ?? [])];
      return scene;
    } finally {
      setThisScene(null);
    }
  };
}
