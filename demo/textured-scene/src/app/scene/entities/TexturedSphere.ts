import { vec3 } from "@dalpeng/math";
import {
  defineGameEntity,
  onStart,
  Transform,
  useComponent,
  useMesh,
  useTexture,
  withName,
} from "dalpeng";
import { makeBrickTextures } from "../../textures/procedural";

export default defineGameEntity(() => {
  withName("TexturedSphere");

  useComponent(Transform, (t) => {
    t.position = vec3(1.5, 0, 0);
  });

  const renderer = useMesh("sphere", (r) => {
    r.material.baseColor = vec3(1, 1, 1);
    r.material.metallic = 0.0;
    r.material.roughness = 0.85;
  });

  const texSet = makeBrickTextures();
  const baseColorTex = useTexture(texSet.baseColor);
  const normalTex = useTexture(texSet.normal, { srgb: false });
  const mrTex = useTexture(texSet.metallicRoughness, { srgb: false });

  onStart(async () => {
    await Promise.all([baseColorTex.ready, normalTex.ready, mrTex.ready]);
    renderer.material.baseColorMap = baseColorTex.texture;
    renderer.material.normalMap = normalTex.texture;
    renderer.material.metallicRoughnessMap = mrTex.texture;
  });
});
