import type { RenderFrameContext, RenderInitContext, RenderPass } from "./RenderPass";

export default class FxaaPass implements RenderPass {
  readonly name = "fxaa";

  init(ctx: RenderInitContext): void {
    ctx.shaders.fxaa.use();
    ctx.shaders.fxaa.setUniform1i("uSource", 0);
  }

  shouldRun(ctx: RenderFrameContext): boolean {
    return !!ctx.features.fxaa;
  }

  execute(ctx: RenderFrameContext): void {
    const { renderer, resources, shaders, shared } = ctx;
    resources.ensureFxaa(renderer); // idempotent — independent of PostComposePass order
    if (!resources.fxaa) return;

    const { width, height } = renderer.getDrawableSize();
    shaders.fxaa.use();
    resources.fxaa.tex.bind(0);
    shaders.fxaa.setUniformVec2("uTexelSize", new Float32Array([1.0 / width, 1.0 / height]));

    renderer.beginPass({
      target: "default",
      depthTest: false,
      depthWrite: false,
      blend: { enable: false },
      clearColor: [0, 0, 0, 1],
      viewport: { x: 0, y: 0, w: width, h: height },
    });
    renderer.drawArrays(shared.fullscreenQuad, { mode: "triangle-strip", count: 4 });
    renderer.endPass();

    // Restore default-framebuffer depth state for the next frame's 3D passes.
    renderer.beginPass({ target: "default", depthTest: true, depthWrite: true });
    renderer.endPass();
  }
}
