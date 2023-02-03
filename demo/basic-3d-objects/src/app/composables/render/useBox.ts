import { MeshBuilder, MeshRenderer, useComponent } from "dalpeng";

const useBox = () => {
  const renderer = useComponent(MeshRenderer);
  renderer.mesh = MeshBuilder.box();
  return renderer;
};

export default useBox;
