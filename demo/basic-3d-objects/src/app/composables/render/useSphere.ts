import { MeshBuilder, MeshRenderer, useComponent } from "dalpeng";

const useSphere = () => {
  const renderer = useComponent(MeshRenderer);
  renderer.mesh = MeshBuilder.sphere();
  return renderer;
};

export default useSphere;
