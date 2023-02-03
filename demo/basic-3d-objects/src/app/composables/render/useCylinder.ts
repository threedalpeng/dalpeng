import { MeshBuilder, MeshRenderer, useComponent } from "dalpeng";

const useBox = () => {
  const renderer = useComponent(MeshRenderer);
  renderer.mesh = MeshBuilder.cylinder();
  return renderer;
};

export default useBox;
