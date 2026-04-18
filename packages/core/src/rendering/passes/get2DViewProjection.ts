import { Mat4 } from "@dalpeng/math";
import type Application from "../../Application";
import Camera from "../../graphics/Camera";
import CameraFollow2D from "../../graphics2d/CameraFollow2D";
import type { PixelArtResources } from "../FrameResources";

/**
 * Build a view-projection matrix for the 2D pass that maps 1 world unit
 * to exactly `pixelsPerUnit` pixels inside the pixel-art FBO, using the
 * snapped view matrix from CameraFollow2D when available.
 */
export function get2DViewProjection(app: Application, pa: PixelArtResources): Mat4 | null {
  let viewProj: Mat4 | null = null;
  app.forEachActiveComponent(Camera, (camera) => {
    if (!camera.isOrthographic) return;
    let viewMatrix = camera.viewMatrix;
    let ppu = 16;
    app.forEachActiveComponent(CameraFollow2D, (cf) => {
      ppu = cf.pixelsPerUnit;
      if (cf.snappedViewMatrix) {
        viewMatrix = cf.snappedViewMatrix;
      }
    });

    const halfW = pa.width / ppu / 2;
    const halfH = pa.height / ppu / 2;
    const proj = Mat4.toWebGL(Mat4.orthographic(halfW, halfH, camera.dNear, camera.dFar));
    viewProj = proj.mul(viewMatrix);
  });
  return viewProj;
}
