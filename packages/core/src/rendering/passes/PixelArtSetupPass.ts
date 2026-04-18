import Camera from "../../graphics/Camera";
import CameraFollow2D from "../../graphics2d/CameraFollow2D";
import type { RenderFrameContext, RenderPass } from "./RenderPass";

/**
 * Sizes the pixel-art FBO to match the orthographic camera's unit-to-pixel mapping
 * and clears it for 2D passes to draw into. FBO dimensions are kept exact multiples
 * of tile size (ppu), so tilemap/sprite batches land on integer pixel boundaries.
 */
export default class PixelArtSetupPass implements RenderPass {
  readonly name = "pixelArtSetup";

  execute(ctx: RenderFrameContext): void {
    const { app, renderer, resources } = ctx;

    let pixelArtWidth = 0;
    let pixelArtHeight = 0;
    app.forEachActiveComponent(Camera, (camera) => {
      if (camera.isOrthographic) {
        let ppu = 16;
        app.forEachActiveComponent(CameraFollow2D, (cf) => {
          ppu = cf.pixelsPerUnit;
        });
        pixelArtHeight = Math.round(camera.size * 2 * ppu);
        pixelArtWidth = Math.round(pixelArtHeight * camera.aspectRatio);
      }
    });
    if (pixelArtWidth > 0 && pixelArtHeight > 0) {
      resources.ensurePixelArt(renderer, pixelArtWidth, pixelArtHeight);
    }

    if (resources.pixelArt) {
      renderer.beginPass({
        target: resources.pixelArt.rt,
        depthTest: false,
        depthWrite: false,
        blend: { enable: false },
        clearColor: [0, 0, 0, 0],
        viewport: { x: 0, y: 0, w: resources.pixelArt.width, h: resources.pixelArt.height },
        colorAttachments: [0],
      });
      renderer.endPass();
    }
  }
}
