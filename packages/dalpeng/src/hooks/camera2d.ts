import type { GameEntity } from "@dalpeng/core";
import { CameraFollow2D } from "@dalpeng/core";
import { useComponent } from "./gameEntity";

export interface CameraFollow2DOptions {
  /** Interpolation factor per frame (0–1). Default: 0.1 */
  lerpFactor?: number;
  /** Snap to nearest pixel for crisp rendering. Default: true */
  pixelPerfect?: boolean;
  /** Pixels per world unit for pixel-perfect snapping. Default: 16 */
  pixelsPerUnit?: number;
  /** Dead zone half-extents in world units. Camera only moves when target exits this window. */
  deadZone?: { halfW: number; halfH: number };
  /** World-space bounds that clamp the camera so it never shows outside the level. */
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Adds a CameraFollow2D component with a lazily-resolved target.
 * `targetFn` is called each lateUpdate tick so the target entity need not exist at setup time.
 */
export function useCameraFollow(
  targetFn: () => GameEntity | null,
  options?: CameraFollow2DOptions
): CameraFollow2D {
  const follow = useComponent(CameraFollow2D, (comp) => {
    if (options?.lerpFactor !== undefined) comp.lerpFactor = options.lerpFactor;
    if (options?.pixelPerfect !== undefined) comp.pixelPerfect = options.pixelPerfect;
    if (options?.pixelsPerUnit !== undefined) comp.pixelsPerUnit = options.pixelsPerUnit;
    if (options?.deadZone !== undefined) comp.deadZone = options.deadZone;
    if (options?.bounds !== undefined) comp.bounds = options.bounds;
  });

  // Patch lateUpdate to resolve the target before each tick.
  const originalLateUpdate = follow.lateUpdate.bind(follow);
  follow.lateUpdate = () => {
    follow.target = targetFn();
    originalLateUpdate();
  };

  return follow;
}
