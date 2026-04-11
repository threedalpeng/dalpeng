import { Scene, type LogicalDescriptor } from "@dalpeng/core";
import { getThisApp, setThisScene } from "../context";

export type UseScene = ReturnType<typeof defineScene>;
export function defineScene(setup: () => readonly LogicalDescriptor[] | void) {
  return (): { scene: Scene; rootDescriptors: readonly LogicalDescriptor[] } => {
    const scene = new Scene();
    setThisScene(scene);
    try {
      getThisApp()?.addScene(scene);
      const rootDescriptors = setup() ?? [];
      scene._pendingRootDescriptors = [...rootDescriptors];
      return { scene, rootDescriptors };
    } finally {
      setThisScene(null);
    }
  };
}
