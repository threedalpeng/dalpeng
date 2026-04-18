import type GfxBuffer from "../../gfx/Buffer";
import type GfxVertexArray from "../../gfx/VertexArray";
import TilemapRenderer, { type TilemapLayerBatch } from "../../graphics2d/TilemapRenderer";
import { get2DViewProjection } from "./get2DViewProjection";
import type { RenderFrameContext, RenderInitContext, RenderPass } from "./RenderPass";

export default class TilemapPass implements RenderPass {
  readonly name = "tilemap";

  #quadVao: GfxVertexArray | null = null;
  #quadVbo: GfxBuffer | null = null;
  #instanceVbo: GfxBuffer | null = null;

  init(ctx: RenderInitContext): void {
    ctx.shaders.sprite2d.use();
    ctx.shaders.sprite2d.setUniform1i("uAtlas", 0);
  }

  execute(ctx: RenderFrameContext): void {
    const { app, renderer, resources, shaders } = ctx;
    if (!resources.pixelArt) return;

    const batches: TilemapLayerBatch[] = [];
    app.forEachActiveComponent(TilemapRenderer, (tmr) => {
      batches.push(...tmr.layerBatches);
    });
    if (batches.length === 0) return;

    const viewProj = get2DViewProjection(app, resources.pixelArt);
    if (!viewProj) return;

    if (!this.#quadVao) {
      this.#quadVao = renderer.createVertexArray();
      this.#quadVbo = renderer.createBuffer("vertex");
      this.#quadVbo.update(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
      const posLoc = shaders.sprite2d.getAttribLocation("aPosition");
      this.#quadVao.setVertexBuffer(posLoc, this.#quadVbo!, 2);
      this.#instanceVbo = renderer.createBuffer("vertex");
    }

    shaders.sprite2d.use();
    shaders.sprite2d.setUniformMat4("uViewProjection", viewProj);

    renderer.beginPass({
      target: resources.pixelArt.rt,
      depthTest: false,
      depthWrite: false,
      blend: { enable: true, mode: "alpha" },
      colorAttachments: [0],
      viewport: { x: 0, y: 0, w: resources.pixelArt.width, h: resources.pixelArt.height },
    });
    renderer.setCullFace?.(false);

    const stride = 14 * 4; // 56 bytes
    for (const batch of batches) {
      this.#instanceVbo!.update(batch.instanceData);

      const posLoc = shaders.sprite2d.getAttribLocation("aInstPos");
      const sizeLoc = shaders.sprite2d.getAttribLocation("aInstSize");
      const uvLoc = shaders.sprite2d.getAttribLocation("aInstUV");
      const tintLoc = shaders.sprite2d.getAttribLocation("aInstTint");
      const depthLoc = shaders.sprite2d.getAttribLocation("aInstDepth");

      this.#quadVao!.setVertexBufferInstanced?.(posLoc, this.#instanceVbo!, 2, 1, {
        stride,
        offset: 0,
      });
      this.#quadVao!.setVertexBufferInstanced?.(sizeLoc, this.#instanceVbo!, 2, 1, {
        stride,
        offset: 8,
      });
      this.#quadVao!.setVertexBufferInstanced?.(uvLoc, this.#instanceVbo!, 4, 1, {
        stride,
        offset: 16,
      });
      this.#quadVao!.setVertexBufferInstanced?.(tintLoc, this.#instanceVbo!, 4, 1, {
        stride,
        offset: 32,
      });
      this.#quadVao!.setVertexBufferInstanced?.(depthLoc, this.#instanceVbo!, 1, 1, {
        stride,
        offset: 48,
      });

      batch.atlas.texture.bind(0);

      renderer.drawArraysInstanced?.(this.#quadVao!, {
        mode: "triangle-strip",
        count: 4,
        instanceCount: batch.tileCount,
      });
    }

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
