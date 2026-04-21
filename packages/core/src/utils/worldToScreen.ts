export function worldToScreen(
  worldPos: [number, number, number],
  viewProj: Float32Array | number[],
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; visible: boolean } {
  const [wx, wy, wz] = worldPos;

  const clipX = viewProj[0] * wx + viewProj[4] * wy + viewProj[8] * wz + viewProj[12];
  const clipY = viewProj[1] * wx + viewProj[5] * wy + viewProj[9] * wz + viewProj[13];
  const clipW = viewProj[3] * wx + viewProj[7] * wy + viewProj[11] * wz + viewProj[15];

  if (clipW <= 0) {
    return { x: 0, y: 0, visible: false };
  }

  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;

  // Y flipped: NDC +1 = top, screen 0 = top
  const x = (ndcX * 0.5 + 0.5) * canvasWidth;
  const y = (1.0 - (ndcY * 0.5 + 0.5)) * canvasHeight;

  return { x, y, visible: true };
}
