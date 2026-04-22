import type { GameEntity } from "@dalpeng/core";
import type { Vec3 } from "@dalpeng/math";

export interface Placement {
  anchor: Anchor;
  offset?: Vec2;
  pivot?: Vec2;
  size?: Size;
}

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * 9-position viewport corner key. Format: `{vertical}{horizontal}`.
 * Vertical: `t` / `c` / `b`. Horizontal: `l` / `c` / `r`. Center: `c` alone.
 */
export type ViewportCorner = "tl" | "tc" | "tr" | "cl" | "c" | "cr" | "bl" | "bc" | "br";

export type Anchor =
  | { kind: "viewport"; corner: ViewportCorner }
  | { kind: "screen"; x: number; y: number }
  | { kind: "world"; point: Vec3 }
  | { kind: "entity"; entity: GameEntity; localOffset?: Vec3 };

export type Size =
  | { kind: "intrinsic" }
  | { kind: "fixed"; w: number; h: number }
  | { kind: "fraction"; w: number; h: number };
