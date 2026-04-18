import type GfxBuffer from "../../gfx/Buffer";
import type GfxVertexArray from "../../gfx/VertexArray";
import CameraFollow2D from "../../graphics2d/CameraFollow2D";
import type { RenderFrameContext, RenderInitContext, RenderPass } from "./RenderPass";

/**
 * Integer-scale upscale of the pixel-art FBO onto the lighting target, with
 * sub-pixel offset compensation so that CameraFollow2D snapping doesn't stutter.
 */
export default class PixelArtBlitPass implements RenderPass {
  readonly name = "pixelArtBlit";

  #vao: GfxVertexArray | null = null;
  #vbo: GfxBuffer | null = null;

  init(ctx: RenderInitContext): void {
    ctx.shaders.blit.use();
    ctx.shaders.blit.setUniform1i("uSource", 0);
  }

  shouldRun(ctx: RenderFrameContext): boolean {
    return !!ctx.resources.pixelArt && !!ctx.resources.lighting;
  }

  execute(ctx: RenderFrameContext): void {
    const { app, renderer, resources, shaders } = ctx;
    const pa = resources.pixelArt!;
    const lt = resources.lighting!;

    if (!this.#vao) {
      this.#vao = renderer.createVertexArray();
      this.#vbo = renderer.createBuffer("vertex");
      this.#vbo.update(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
      const posLoc = shaders.blit.getAttribLocation("aPosition");
      this.#vao.setVertexBuffer(posLoc, this.#vbo!, 2);
    }

    const { width, height } = renderer.getDrawableSize();

    const scaleX = Math.max(1, Math.floor(width / pa.width));
    const scaleY = Math.max(1, Math.floor(height / pa.height));
    const scale = Math.min(scaleX, scaleY);
    const blitW = pa.width * scale;
    const blitH = pa.height * scale;

    let subPixelOffsetX = 0;
    let subPixelOffsetY = 0;
    app.forEachActiveComponent(CameraFollow2D, (cf) => {
      if (cf.pixelPerfect) {
        subPixelOffsetX = cf.subPixelX * cf.pixelsPerUnit * scale;
        subPixelOffsetY = cf.subPixelY * cf.pixelsPerUnit * scale;
      }
    });

    const offsetX = Math.round((width - blitW) / 2 - subPixelOffsetX);
    const offsetY = Math.round((height - blitH) / 2 - subPixelOffsetY);

    shaders.blit.use();
    pa.color.bind(0);

    renderer.beginPass({
      target: lt.rt,
      depthTest: false,
      depthWrite: false,
      blend: { enable: true, mode: "alpha" },
      colorAttachments: [0],
      viewport: { x: offsetX, y: offsetY, w: blitW, h: blitH },
    });
    renderer.drawArrays(this.#vao, { mode: "triangle-strip", count: 4 });
    renderer.endPass();
  }

  dispose(): void {
    this.#vbo?.dispose();
    this.#vao = null;
    this.#vbo = null;
  }
}
