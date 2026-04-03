import type GfxBuffer from "../gfx/Buffer";
import type { RendererBackend } from "../gfx/RendererBackend";
import type GfxVertexArray from "../gfx/VertexArray";
import type Shader from "../graphics/Shader";
import type { RenderConfig } from "../RenderConfig";
import type FrameResources from "./FrameResources";

export default class PostProcessing {
  #vao: GfxVertexArray | null = null;
  #vbo: GfxBuffer | null = null;

  render(
    renderer: RendererBackend,
    resources: FrameResources,
    shaders: { post: Shader; bloomBright?: Shader; bloomBlur?: Shader; fxaa?: Shader },
    config: RenderConfig
  ): void {
    this.#ensureQuad(renderer, shaders.post);

    // Bloom passes (before final composite)
    if (config.bloom && resources.bloom && shaders.bloomBright && shaders.bloomBlur) {
      this.#renderBloom(renderer, resources, shaders.bloomBright, shaders.bloomBlur, config);
    }

    // Determine composite target: if FXAA is enabled, render to intermediate FBO
    const hasFxaa = config.fxaa && shaders.fxaa && resources.fxaa;
    const compositeTarget = hasFxaa ? resources.fxaa!.rt : "default" as const;

    // Final composite: tone mapping + bloom
    shaders.post.use();

    if (resources.lighting) {
      resources.lighting.color.bind(4);
      shaders.post.setUniform1i("uLighting", 4);
    }
    shaders.post.setUniform1f("uExposure", config.toneExposure ?? 1.0);
    shaders.post.setUniform1f("uGamma", config.toneGamma ?? 2.2);
    shaders.post.setUniform1i("uToneMap", config.postToneMapping ? 1 : 0);

    // Bloom uniforms
    const hasBloom = config.bloom && resources.bloom;
    shaders.post.setUniform1i("uEnableBloom", hasBloom ? 1 : 0);
    if (hasBloom && resources.bloom) {
      resources.bloom.texA.bind(5);
      shaders.post.setUniform1i("uBloom", 5);
      shaders.post.setUniform1f("uBloomIntensity", config.bloomIntensity ?? 0.5);
    }

    // Restore full-resolution viewport (bloom passes leave it at half-res)
    const { width, height } = renderer.getDrawableSize();
    renderer.beginPass({
      target: compositeTarget,
      depthTest: false,
      depthWrite: false,
      blend: { enable: false },
      clearColor: [0, 0, 0, 1],
      viewport: { x: 0, y: 0, w: width, h: height },
    });

    renderer.drawArrays(this.#vao!, { mode: "triangle-strip", count: 4 });
    renderer.endPass();

    // FXAA pass: read from intermediate FBO, write to default framebuffer
    if (hasFxaa && shaders.fxaa && resources.fxaa) {
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
      renderer.drawArrays(this.#vao!, { mode: "triangle-strip", count: 4 });
      renderer.endPass();
    }

    // Restore depth state for subsequent 3D passes (next frame)
    renderer.beginPass({
      target: "default",
      depthTest: true,
      depthWrite: true,
    });
    renderer.endPass();
  }

  #renderBloom(
    renderer: RendererBackend,
    resources: FrameResources,
    brightShader: Shader,
    blurShader: Shader,
    config: RenderConfig
  ): void {
    const bloom = resources.bloom!;

    // 1. Bright extract
    brightShader.use();
    if (resources.lighting) {
      resources.lighting.color.bind(4);
      brightShader.setUniform1i("uLighting", 4);
    }
    brightShader.setUniform1f("uThreshold", config.bloomThreshold ?? 1.0);
    brightShader.setUniform1f("uSoftKnee", 0.5);

    renderer.beginPass({
      target: bloom.rtA,
      depthTest: false,
      depthWrite: false,
      blend: { enable: false },
      clearColor: [0, 0, 0, 0],
      viewport: { x: 0, y: 0, w: bloom.width, h: bloom.height },
      colorAttachments: [0],
    });
    renderer.drawArrays(this.#vao!, { mode: "triangle-strip", count: 4 });
    renderer.endPass();

    // 2. Ping-pong Gaussian blur
    const iterations = Math.max(1, config.bloomRadius ?? 5);
    const texelW = 1.0 / bloom.width;
    const texelH = 1.0 / bloom.height;

    blurShader.use();
    blurShader.setUniform1i("uSource", 5);

    for (let i = 0; i < iterations; i++) {
      // Horizontal: read A → write B
      bloom.texA.bind(5);
      renderer.beginPass({
        target: bloom.rtB,
        depthTest: false,
        depthWrite: false,
        blend: { enable: false },
        viewport: { x: 0, y: 0, w: bloom.width, h: bloom.height },
        colorAttachments: [0],
      });
      blurShader.setUniform1i("uSource", 5);
      blurShader.setUniformVec2("uDirection", new Float32Array([1.0, 0.0]));
      blurShader.setUniformVec2("uTexelSize", new Float32Array([texelW, texelH]));
      renderer.drawArrays(this.#vao!, { mode: "triangle-strip", count: 4 });
      renderer.endPass();

      // Vertical: read B → write A
      bloom.texB.bind(5);
      renderer.beginPass({
        target: bloom.rtA,
        depthTest: false,
        depthWrite: false,
        blend: { enable: false },
        viewport: { x: 0, y: 0, w: bloom.width, h: bloom.height },
        colorAttachments: [0],
      });
      blurShader.setUniform1i("uSource", 5);
      blurShader.setUniformVec2("uDirection", new Float32Array([0.0, 1.0]));
      blurShader.setUniformVec2("uTexelSize", new Float32Array([texelW, texelH]));
      renderer.drawArrays(this.#vao!, { mode: "triangle-strip", count: 4 });
      renderer.endPass();
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
