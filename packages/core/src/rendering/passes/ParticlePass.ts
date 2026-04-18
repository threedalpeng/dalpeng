import type GfxBuffer from "../../gfx/Buffer";
import type GfxVertexArray from "../../gfx/VertexArray";
import Camera from "../../graphics/Camera";
import ParticleEmitter from "../../graphics/ParticleEmitter";
import type { RenderFrameContext, RenderPass } from "./RenderPass";

export default class ParticlePass implements RenderPass {
  readonly name = "particles";

  static #IDENTITY_MAT4 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

  #quadVao: GfxVertexArray | null = null;
  #quadVbo: GfxBuffer | null = null;
  #instanceVbo: GfxBuffer | null = null;

  execute(ctx: RenderFrameContext): void {
    const { app, renderer, resources, shaders } = ctx;
    if (!resources.lighting) return;

    let hasParticles = false;
    app.forEachActiveComponent(ParticleEmitter, (emitter) => {
      if (emitter.aliveCount > 0) hasParticles = true;
    });
    if (!hasParticles) return;

    renderer.beginPass({
      target: resources.lighting.rt,
      depthTest: true,
      depthWrite: false,
      blend: { enable: true, mode: "premultiplied-additive" },
      colorAttachments: [0],
    });
    renderer.setCullFace?.(false);

    const particleShader = shaders.particle;
    particleShader.use();
    app.forEachActiveComponent(Camera, (camera) => {
      particleShader.setUniformMat4("uView", camera.viewMatrix);
      particleShader.setUniformMat4("uProjection", camera.glProjectionMatrix);
    });

    if (!this.#quadVao) {
      this.#quadVao = renderer.createVertexArray();
      this.#quadVbo = renderer.createBuffer("vertex");
      this.#quadVbo.update(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
      const posLoc = particleShader.getAttribLocation("aPosition");
      this.#quadVao.setVertexBuffer(posLoc, this.#quadVbo!, 2);
      this.#instanceVbo = renderer.createBuffer("vertex");
    }

    app.forEachActiveComponent(ParticleEmitter, (emitter) => {
      const count = emitter.aliveCount;
      if (count === 0) return;

      this.#instanceVbo!.update(emitter.instanceData.subarray(0, count * 8));

      const posSizeLoc = particleShader.getAttribLocation("aInstancePosSize");
      const colorLoc = particleShader.getAttribLocation("aInstanceColor");
      this.#quadVao!.setVertexBufferInstanced?.(posSizeLoc, this.#instanceVbo!, 4, 1, {
        stride: 32,
        offset: 0,
      });
      this.#quadVao!.setVertexBufferInstanced?.(colorLoc, this.#instanceVbo!, 4, 1, {
        stride: 32,
        offset: 16,
      });

      particleShader.setUniformMat4("uModel", ParticlePass.#IDENTITY_MAT4);

      renderer.drawArraysInstanced?.(this.#quadVao!, {
        mode: "triangle-strip",
        count: 4,
        instanceCount: count,
      });
    });

    renderer.setCullFace?.(true);
    renderer.endPass();
  }

  dispose(): void {
    this.#quadVbo?.dispose();
    this.#instanceVbo?.dispose();
    this.#quadVao = null;
    this.#quadVbo = null;
    this.#instanceVbo = null;
  }
}
