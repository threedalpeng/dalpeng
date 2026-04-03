/**
 * Projects a 3D world position onto 2D screen coordinates.
 *
 * @param worldPos  - [x, y, z] world-space position
 * @param viewProj  - 4x4 view-projection matrix (column-major Float32Array or number[])
 * @param canvasWidth  - canvas pixel width
 * @param canvasHeight - canvas pixel height
 * @returns { x, y, visible } where x/y are pixel coords, visible is false if behind camera
 */
export function worldToScreen(
  worldPos: [number, number, number],
  viewProj: Float32Array | number[],
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; visible: boolean } {
  const [wx, wy, wz] = worldPos;

  // Multiply by view-projection matrix (column-major)
  const clipX = viewProj[0] * wx + viewProj[4] * wy + viewProj[8]  * wz + viewProj[12];
  const clipY = viewProj[1] * wx + viewProj[5] * wy + viewProj[9]  * wz + viewProj[13];
  const clipW = viewProj[3] * wx + viewProj[7] * wy + viewProj[11] * wz + viewProj[15];

  // Behind camera check
  if (clipW <= 0) {
    return { x: 0, y: 0, visible: false };
  }

  // Perspective divide → NDC [-1, 1]
  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;

  // NDC → screen pixels (Y flipped: NDC +1 = top, screen 0 = top)
  const x = (ndcX * 0.5 + 0.5) * canvasWidth;
  const y = (1.0 - (ndcY * 0.5 + 0.5)) * canvasHeight;

  return { x, y, visible: true };
}
