import type Shader from "../../graphics/Shader";
import type { RenderFrameContext, RenderPass } from "./RenderPass";

export default class BloomPass implements RenderPass {
  readonly name = "bloom";

  shouldRun(ctx: RenderFrameContext): boolean {
    return !!ctx.features.bloom && !!ctx.resources.lighting;
  }

  execute(ctx: RenderFrameContext): void {
    const { renderer, resources } = ctx;
    resources.ensureBloom(renderer);
    if (!resources.bloom || !resources.lighting) return;

    this.#brightExtract(ctx);
    this.#blur(ctx);
    // Output stays in resources.bloom.texA for PostComposePass.
  }

  #brightExtract(ctx: RenderFrameContext): void {
    const { renderer, resources, features, shaders, shared } = ctx;
    const bloom = resources.bloom!;
    const bright = shaders.bloomBright;

    bright.use();
    if (resources.lighting) {
      resources.lighting.color.bind(4);
      bright.setUniform1i("uLighting", 4);
    }
    bright.setUniform1f("uThreshold", features.bloomThreshold ?? 1.0);
    bright.setUniform1f("uSoftKnee", 0.5);

    renderer.beginPass({
      target: bloom.rtA,
      depthTest: false,
      depthWrite: false,
      blend: { enable: false },
      clearColor: [0, 0, 0, 0],
      viewport: { x: 0, y: 0, w: bloom.width, h: bloom.height },
      colorAttachments: [0],
    });
    renderer.drawArrays(shared.fullscreenQuad, { mode: "triangle-strip", count: 4 });
    renderer.endPass();
  }

  #blur(ctx: RenderFrameContext): void {
    const { renderer, resources, features, shaders, shared } = ctx;
    const bloom = resources.bloom!;
    const blur: Shader = shaders.bloomBlur;

    const iterations = Math.max(1, features.bloomRadius ?? 5);
    const texelW = 1.0 / bloom.width;
    const texelH = 1.0 / bloom.height;

    blur.use();
    blur.setUniform1i("uSource", 5);

    for (let i = 0; i < iterations; i++) {
      // Horizontal: A → B
      bloom.texA.bind(5);
      renderer.beginPass({
        target: bloom.rtB,
        depthTest: false,
        depthWrite: false,
        blend: { enable: false },
        viewport: { x: 0, y: 0, w: bloom.width, h: bloom.height },
        colorAttachments: [0],
      });
      blur.setUniform1i("uSource", 5);
      blur.setUniformVec2("uDirection", new Float32Array([1.0, 0.0]));
      blur.setUniformVec2("uTexelSize", new Float32Array([texelW, texelH]));
      renderer.drawArrays(shared.fullscreenQuad, { mode: "triangle-strip", count: 4 });
      renderer.endPass();

      // Vertical: B → A
      bloom.texB.bind(5);
      renderer.beginPass({
        target: bloom.rtA,
        depthTest: false,
        depthWrite: false,
        blend: { enable: false },
        viewport: { x: 0, y: 0, w: bloom.width, h: bloom.height },
        colorAttachments: [0],
      });
      blur.setUniform1i("uSource", 5);
      blur.setUniformVec2("uDirection", new Float32Array([0.0, 1.0]));
      blur.setUniformVec2("uTexelSize", new Float32Array([texelW, texelH]));
      renderer.drawArrays(shared.fullscreenQuad, { mode: "triangle-strip", count: 4 });
      renderer.endPass();
    }
  }
}
