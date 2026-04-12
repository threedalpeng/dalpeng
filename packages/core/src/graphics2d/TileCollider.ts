import type { ParsedTiledMap } from "./tiled/TiledImporter";
import type { TriggerZone } from "./TriggerZone";

export default class TileCollider {
  #solidGrid: Uint8Array;
  #mapWidth: number;
  #mapHeight: number;
  #tileW: number;
  #tileH: number;
  #triggerZones: TriggerZone[];

  constructor(map: ParsedTiledMap, pixelsPerUnit: number) {
    this.#mapWidth = map.mapWidth;
    this.#mapHeight = map.mapHeight;
    this.#tileW = map.tileWidth / pixelsPerUnit;
    this.#tileH = map.tileHeight / pixelsPerUnit;
    this.#solidGrid = new Uint8Array(map.mapWidth * map.mapHeight);

    // Build solid grid from collision layers
    for (const layer of map.tileLayers) {
      if (!layer.isCollision) continue;
      for (let i = 0; i < layer.tiles.length; i++) {
        if (layer.tiles[i] !== 0) {
          this.#solidGrid[i] = 1;
        }
      }
    }

    // Collect trigger zones from object layers
    this.#triggerZones = [];
    for (const layer of map.objectLayers) {
      this.#triggerZones.push(...layer.objects);
    }
  }

  isSolid(col: number, row: number): boolean {
    if (col < 0 || col >= this.#mapWidth || row < 0 || row >= this.#mapHeight) return true;
    return this.#solidGrid[row * this.#mapWidth + col] === 1;
  }

  // Axis-separated AABB vs tile grid sweep
  resolveAABB(
    worldX: number,
    worldY: number,
    halfW: number,
    halfH: number,
    dx: number,
    dy: number
  ): { x: number; y: number; hitX: boolean; hitY: boolean } {
    let newX = worldX + dx;
    let newY = worldY + dy;
    let hitX = false;
    let hitY = false;

    // Horizontal sweep
    if (dx !== 0) {
      const testX = newX;
      if (this.#testAABB(testX, worldY, halfW, halfH)) {
        newX = worldX;
        hitX = true;
      }
    }

    // Vertical sweep
    if (dy !== 0) {
      const testY = newY;
      if (this.#testAABB(newX, testY, halfW, halfH)) {
        newY = worldY;
        hitY = true;
      }
    }

    return { x: newX, y: newY, hitX, hitY };
  }

  // Convert world Y (Y-up) to grid row (Y-down, Tiled order)
  #worldYToRow(worldY: number): number {
    return this.#mapHeight - 1 - Math.floor(worldY / this.#tileH);
  }

  #testAABB(cx: number, cy: number, halfW: number, halfH: number): boolean {
    const minCol = Math.floor((cx - halfW) / this.#tileW);
    const maxCol = Math.floor((cx + halfW - 0.001) / this.#tileW);
    // Y-up: lower worldY = higher row index
    const minRow = this.#worldYToRow(cy + halfH - 0.001);
    const maxRow = this.#worldYToRow(cy - halfH);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (this.isSolid(col, row)) return true;
      }
    }
    return false;
  }

  overlappingTriggers(worldX: number, worldY: number, halfW: number, halfH: number): TriggerZone[] {
    const result: TriggerZone[] = [];
    const left = worldX - halfW;
    const right = worldX + halfW;
    const top = worldY - halfH;
    const bottom = worldY + halfH;

    for (const zone of this.#triggerZones) {
      const zRight = zone.worldX + zone.worldW;
      const zBottom = zone.worldY + zone.worldH;
      if (right > zone.worldX && left < zRight && bottom > zone.worldY && top < zBottom) {
        result.push(zone);
      }
    }
    return result;
  }

  get triggerZones(): TriggerZone[] {
    return this.#triggerZones;
  }
}
