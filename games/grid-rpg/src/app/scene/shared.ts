import type { TileCollider } from "@dalpeng/core";

// Shared state between entities within the scene.
// Set by Tilemap, read by Player and other entities.
export let tileCollider: TileCollider | null = null;

export function setTileCollider(collider: TileCollider): void {
  tileCollider = collider;
}
