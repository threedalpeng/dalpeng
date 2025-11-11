import { MeshBuilder, SpriteRenderer, useComponent } from "dalpeng";

const useQuad = () => {
  const renderer = useComponent(SpriteRenderer);
  renderer.mesh = MeshBuilder.quad();
  return renderer;
};

export default useQuad;

