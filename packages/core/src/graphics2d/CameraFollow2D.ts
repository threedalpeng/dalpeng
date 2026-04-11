import { Mat4, Vec3 } from "@dalpeng/math";
import Component from "../ecs/Component";
import type GameEntity from "../ecs/GameEntity";
import Transform from "../ecs/Transform";
import Camera from "../graphics/Camera";

export default class CameraFollow2D extends Component {
  target: GameEntity | null = null;
  lerpFactor = 0.1;
  pixelPerfect = true;
  pixelsPerUnit = 16;
  deadZone: { halfW: number; halfH: number } | null = null;
  bounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null;

  // Sub-pixel remainder for blit compensation (world units)
  subPixelX = 0;
  subPixelY = 0;

  #transform!: Transform;
  #camera!: Camera;
  #snappedViewMatrix: Mat4 | null = null;

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
    this.#transform = gameEntity.getComponent(Transform)!;
    this.#camera = gameEntity.getComponent(Camera)!;
  }

  get snappedViewMatrix(): Mat4 | null {
    return this.#snappedViewMatrix;
  }

  lateUpdate(): void {
    if (!this.target) return;

    const targetPos = this.target.getComponent(Transform)!.worldPosition;
    const camPos = this.#transform.position;

    let targetX = targetPos[0];
    let targetY = targetPos[1];

    // Dead zone
    if (this.deadZone) {
      const dx = targetX - camPos[0];
      const dy = targetY - camPos[1];
      if (Math.abs(dx) < this.deadZone.halfW) targetX = camPos[0];
      else targetX = camPos[0] + (dx > 0 ? dx - this.deadZone.halfW : dx + this.deadZone.halfW);
      if (Math.abs(dy) < this.deadZone.halfH) targetY = camPos[1];
      else targetY = camPos[1] + (dy > 0 ? dy - this.deadZone.halfH : dy + this.deadZone.halfH);
    }

    // Lerp (smooth sub-pixel)
    let newX = camPos[0] + (targetX - camPos[0]) * this.lerpFactor;
    let newY = camPos[1] + (targetY - camPos[1]) * this.lerpFactor;

    // Bounds clamping
    if (this.bounds && this.#camera.isOrthographic) {
      const halfH = this.#camera.size;
      const halfW = halfH * this.#camera.aspectRatio;
      newX = Math.max(this.bounds.minX + halfW, Math.min(this.bounds.maxX - halfW, newX));
      newY = Math.max(this.bounds.minY + halfH, Math.min(this.bounds.maxY - halfH, newY));
    }

    const z = camPos[2];
    // Store the real smooth position on the transform
    this.#transform.position = new Vec3([newX, newY, z]);

    if (this.pixelPerfect) {
      // Snap camera to FBO pixel grid for the view matrix used in 2D rendering.
      // This ensures all tiles/sprites rasterize on exact pixel boundaries inside the FBO.
      // The sub-pixel remainder is compensated by shifting the blit quad.
      const ppu = this.pixelsPerUnit;
      const snapX = Math.round(newX * ppu) / ppu;
      const snapY = Math.round(newY * ppu) / ppu;
      this.subPixelX = newX - snapX;
      this.subPixelY = newY - snapY;

      const snappedEye = new Vec3([snapX, snapY, z]);
      const snappedAt = snappedEye.add(this.#transform.forward);
      this.#snappedViewMatrix = Mat4.view(snappedEye, snappedAt, this.#transform.up);
    } else {
      this.subPixelX = 0;
      this.subPixelY = 0;
      this.#snappedViewMatrix = null;
    }
  }
}
