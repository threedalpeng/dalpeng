import type { RenderFrameContext, RenderPass } from "./RenderPass";

/**
 * Tone maps the lighting buffer, composites bloom, and writes to either the
 * default framebuffer or the FXAA intermediate FBO (when FXAA is enabled).
 */
export default class PostComposePass implements RenderPass {
  readonly name = "postCompose";

  execute(ctx: RenderFrameContext): void {
    const { renderer, resources, features, shaders, shared } = ctx;

    if (features.fxaa.value) {
      resources.ensureFxaa(renderer);
    }

    const hasFxaa = !!features.fxaa.value && !!resources.fxaa;
    const compositeTarget = hasFxaa ? resources.fxaa!.rt : ("default" as const);

    shaders.post.use();

    if (resources.lighting) {
      resources.lighting.color.bind(4);
      shaders.post.setUniform1i("uLighting", 4);
    }
    shaders.post.setUniform1f("uExposure", features.toneExposure.value ?? 1.0);
    shaders.post.setUniform1f("uGamma", features.toneGamma.value ?? 2.2);
    shaders.post.setUniform1i("uToneMap", features.postToneMapping.value ? 1 : 0);

    const hasBloom = !!features.bloom.value && !!resources.bloom;
    shaders.post.setUniform1i("uEnableBloom", hasBloom ? 1 : 0);
    if (hasBloom && resources.bloom) {
      resources.bloom.texA.bind(5);
      shaders.post.setUniform1i("uBloom", 5);
      shaders.post.setUniform1f("uBloomIntensity", features.bloomIntensity.value ?? 0.5);
    }

    const { width, height } = renderer.getDrawableSize();
    renderer.beginPass({
      target: compositeTarget,
      depthTest: false,
      depthWrite: false,
      blend: { enable: false },
      clearColor: [0, 0, 0, 1],
      viewport: { x: 0, y: 0, w: width, h: height },
    });
    renderer.drawArrays(shared.fullscreenQuad, { mode: "triangle-strip", count: 4 });
    renderer.endPass();

    if (!hasFxaa) {
      // Reset depth state; FxaaPass handles this when active.
      renderer.beginPass({ target: "default", depthTest: true, depthWrite: true });
      renderer.endPass();
    }
  }
}
