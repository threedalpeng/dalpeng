import Camera from "../../graphics/Camera";
import MeshRenderer from "../../graphics/MeshRenderer";
import SkinnedMeshRenderer from "../../graphics/SkinnedMeshRenderer";
import SpriteRenderer from "../../graphics/SpriteRenderer";
import type { RenderFrameContext, RenderInitContext, RenderPass } from "./RenderPass";

export default class GeometryPass implements RenderPass {
  readonly name = "geometry";

  init(ctx: RenderInitContext): void {
    const s = ctx.shaders.geometry;
    s.use();
    s.setUniform1i("uBaseColorMap", 0);
    s.setUniform1i("uNormalMap", 1);
    s.setUniform1i("uMetallicRoughnessMap", 2);
    s.setUniform1i("uEmissiveMap", 3);
    s.setUniform1i("uOcclusionMap", 4);
  }

  execute(ctx: RenderFrameContext): void {
    const { app, renderer, resources, features, shaders } = ctx;
    const { width, height } = renderer.getDrawableSize();

    shaders.geometry.use();
    renderer.beginPass({
      target: resources.gbuffer!.rt,
      depthTest: true,
      depthWrite: true,
      blend: { enable: false },
      clearColor: [0, 0, 0, 0],
      clearDepth: 1,
      colorAttachments: [0, 1, 2, 3],
      viewport: { x: 0, y: 0, w: width, h: height },
    });
    if (features.debugGLVerbose.value) {
      renderer.debugDumpState?.("after geometry beginPass");
      renderer.debugCheckError?.("after geometry beginPass");
    }

    app.forEachActiveComponent(Camera, (camera) => {
      camera.renderCameraToGeometry();
    });
    app.forEachActiveComponent(MeshRenderer, (r) => {
      r.render();
    });
    app.forEachActiveComponent(SkinnedMeshRenderer, (r) => {
      r.render();
    });
    app.forEachActiveComponent(SpriteRenderer, (r) => {
      r.render();
    });
    renderer.endPass();
    if (features.debugGLVerbose.value) renderer.debugCheckError?.("after geometry endPass");
  }
}
