import type GfxBuffer from "../../gfx/Buffer";
import type GfxVertexArray from "../../gfx/VertexArray";
import Sprite2DRenderer from "../../graphics2d/Sprite2DRenderer";
import { get2DViewProjection } from "./get2DViewProjection";
import type { RenderFrameContext, RenderPass } from "./RenderPass";

export default class Sprite2DPass implements RenderPass {
  readonly name = "sprite2d";

  #quadVao: GfxVertexArray | null = null;
  #quadVbo: GfxBuffer | null = null;
  #instanceVbo: GfxBuffer | null = null;
  #instanceBuf = new Float32Array(0);

  execute(ctx: RenderFrameContext): void {
    const { app, renderer, resources, shaders } = ctx;
    if (!resources.pixelArt) return;

    const sprites: { renderer: Sprite2DRenderer; sortKey: number }[] = [];
    app.forEachActiveComponent(Sprite2DRenderer, (s) => {
      if (!s.atlas) return;
      const layerName = s.gameEntity._layerName;
      const layerIndex = layerName
        ? (app.layers.get(layerName)?.index ?? s.sortingLayer)
        : s.sortingLayer;
      sprites.push({ renderer: s, sortKey: s.getSortKey(layerIndex) });
    });
    if (sprites.length === 0) return;

    sprites.sort((a, b) => a.sortKey - b.sortKey);

    const floatsPerSprite = 14;
    const totalFloats = sprites.length * floatsPerSprite;
    if (this.#instanceBuf.length < totalFloats) {
      this.#instanceBuf = new Float32Array(totalFloats);
    }
    for (let i = 0; i < sprites.length; i++) {
      sprites[i].renderer.writeInstanceData(this.#instanceBuf, i * floatsPerSprite);
    }

    if (!this.#quadVao) {
      this.#quadVao = renderer.createVertexArray();
      this.#quadVbo = renderer.createBuffer("vertex");
      this.#quadVbo.update(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
      const posLoc = shaders.sprite2d.getAttribLocation("aPosition");
      this.#quadVao.setVertexBuffer(posLoc, this.#quadVbo!, 2);
      this.#instanceVbo = renderer.createBuffer("vertex");
    }

    const viewProj = get2DViewProjection(app, resources.pixelArt);
    if (!viewProj) return;

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

    let batchStart = 0;
    while (batchStart < sprites.length) {
      const currentAtlas = sprites[batchStart].renderer.atlas!;
      let batchEnd = batchStart + 1;
      while (batchEnd < sprites.length && sprites[batchEnd].renderer.atlas === currentAtlas) {
        batchEnd++;
      }

      const batchCount = batchEnd - batchStart;
      const batchOffset = batchStart * floatsPerSprite;
      const batchData = this.#instanceBuf.subarray(
        batchOffset,
        batchOffset + batchCount * floatsPerSprite
      );

      this.#instanceVbo!.update(batchData);

      const stride = floatsPerSprite * 4;
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

      currentAtlas.texture.bind(0);

      renderer.drawArraysInstanced?.(this.#quadVao!, {
        mode: "triangle-strip",
        count: 4,
        instanceCount: batchCount,
      });

      batchStart = batchEnd;
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
