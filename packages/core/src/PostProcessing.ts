import type GfxBuffer from "./gfx/Buffer";
import type { RendererBackend } from "./gfx/RendererBackend";
import type GfxVertexArray from "./gfx/VertexArray";
import type Shader from "./graphics/Shader";
import type { RenderConfig } from "./RenderConfig";

export default class PostProcessing {
  #vao: GfxVertexArray | null = null;
  #vbo: GfxBuffer | null = null;

  render(
    renderer: RendererBackend,
    shaders: { post: Shader; bloomBright?: Shader; bloomBlur?: Shader },
    config: RenderConfig
  ): void {
    this.#ensureQuad(renderer, shaders.post);

    // Bloom passes (before final composite)
    if (config.bloom && shaders.bloomBright && shaders.bloomBlur) {
      this.#renderBloom(renderer, shaders.bloomBright, shaders.bloomBlur, config);
    }

    // Final composite: tone mapping + bloom
    shaders.post.use();

    if (renderer.hasLightingTexture?.()) {
      renderer.bindLightingTexture?.(4);
      shaders.post.setUniform1i("uLighting", 4);
    }
    shaders.post.setUniform1f("uExposure", config.toneExposure ?? 1.0);
    shaders.post.setUniform1f("uGamma", config.toneGamma ?? 2.2);

    // Bloom uniforms
    const hasBloom = config.bloom && renderer.hasBloomTexture?.();
    shaders.post.setUniform1i("uEnableBloom", hasBloom ? 1 : 0);
    if (hasBloom) {
      renderer.bindBloomTexture?.(5);
      shaders.post.setUniform1i("uBloom", 5);
      shaders.post.setUniform1f("uBloomIntensity", config.bloomIntensity ?? 0.5);
    }

    // Restore full-resolution viewport (bloom passes leave it at half-res)
    const { width, height } = renderer.getDrawableSize();
    renderer.beginPass?.({
      target: "default",
      depthWrite: false,
      blend: { enable: false },
      clearColor: [0, 0, 0, 1],
      viewport: { x: 0, y: 0, w: width, h: height },
    });
    if (config.debugGLVerbose) {
      renderer.debugDumpState?.("before post draw");
      renderer.debugCheckError?.("before post draw");
    }
    renderer.drawArrays(this.#vao!, { mode: "triangle-strip", count: 4 });
    if (config.debugGLVerbose) {
      renderer.debugDumpState?.("after post draw");
      renderer.debugCheckError?.("after post draw");
    }
    renderer.endPass?.();
  }

  #renderBloom(
    renderer: RendererBackend,
    brightShader: Shader,
    blurShader: Shader,
    config: RenderConfig
  ): void {
    // 1. Bright extract
    brightShader.use();
    if (renderer.hasLightingTexture?.()) {
      renderer.bindLightingTexture?.(4);
      brightShader.setUniform1i("uLighting", 4);
    }
    brightShader.setUniform1f("uThreshold", config.bloomThreshold ?? 1.0);
    brightShader.setUniform1f("uSoftKnee", 0.5);

    renderer.beginBloomBrightPass?.();
    renderer.drawArrays(this.#vao!, { mode: "triangle-strip", count: 4 });
    renderer.endBloomPass?.();

    // 2. Ping-pong Gaussian blur
    const iterations = Math.max(1, config.bloomRadius ?? 5);
    const bloomSize = (renderer as any).getBloomSize?.() as [number, number] | undefined;
    const texelW = bloomSize ? 1.0 / bloomSize[0] : 1.0 / 640;
    const texelH = bloomSize ? 1.0 / bloomSize[1] : 1.0 / 360;

    blurShader.use();
    blurShader.setUniform1i("uSource", 5);

    for (let i = 0; i < iterations; i++) {
      // Horizontal: read A → write B
      renderer.beginBloomBlurPass?.(true);
      blurShader.setUniform1i("uSource", 5);
      blurShader.setUniformVec2("uDirection", new Float32Array([1.0, 0.0]));
      blurShader.setUniformVec2("uTexelSize", new Float32Array([texelW, texelH]));
      renderer.drawArrays(this.#vao!, { mode: "triangle-strip", count: 4 });
      renderer.endBloomPass?.();

      // Vertical: read B → write A
      renderer.beginBloomBlurPass?.(false);
      blurShader.setUniform1i("uSource", 5);
      blurShader.setUniformVec2("uDirection", new Float32Array([0.0, 1.0]));
      blurShader.setUniformVec2("uTexelSize", new Float32Array([texelW, texelH]));
      renderer.drawArrays(this.#vao!, { mode: "triangle-strip", count: 4 });
      renderer.endBloomPass?.();
    }
  }

  dispose(): void {
    this.#vao = null;
    this.#vbo = null;
  }

  #ensureQuad(renderer: RendererBackend, shader: Shader): void {
    if (!this.#vao) {
      this.#vao = renderer.createVertexArray();
    }
    if (!this.#vbo) {
      this.#vbo = renderer.createBuffer("vertex");
      const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
      this.#vbo.update(quad);
      const loc = shader.getAttribLocation("aPosition");
      this.#vao.setVertexBuffer(loc, this.#vbo, 2);
    }
  }
}
