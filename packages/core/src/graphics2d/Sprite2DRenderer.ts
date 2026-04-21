import Component from "../ecs/Component";
import type GameEntity from "../ecs/GameEntity";
import Transform from "../ecs/Transform";
import type SpriteAtlas from "./SpriteAtlas";

export default class Sprite2DRenderer extends Component {
  atlas: SpriteAtlas | null = null;
  frame: number | string = 0;
  tint: Float32Array = new Float32Array([1, 1, 1, 1]);
  pixelsPerUnit = 16;
  flipX = false;
  flipY = false;
  /** @deprecated Use `withLayer(name)` instead; pipeline falls back to this only when no layer name is set. */
  sortingLayer = 0;

  #transform!: Transform;

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
    this.#transform = gameEntity.getComponent(Transform)!;
  }

  // 14 floats per instance written into shared buffer
  writeInstanceData(buf: Float32Array, offset: number): void {
    if (!this.atlas) return;

    const uv = this.atlas.getUV(this.frame);
    const pos = this.#transform.worldPosition;
    const scale = this.#transform.scale;

    const ppu = this.pixelsPerUnit;
    const baseW = this.atlas.framePixelWidth > 0 ? this.atlas.framePixelWidth / ppu : 1;
    const baseH = this.atlas.framePixelHeight > 0 ? this.atlas.framePixelHeight / ppu : 1;
    let w = baseW * scale[0];
    let h = baseH * scale[1];

    let uvX = uv[0];
    let uvY = uv[1];
    let uvW = uv[2];
    let uvH = uv[3];

    if (this.flipX) {
      uvX = uv[0] + uvW;
      uvW = -uvW;
    }
    if (this.flipY) {
      uvY = uv[1] + uvH;
      uvH = -uvH;
    }

    buf[offset + 0] = pos[0];
    buf[offset + 1] = pos[1];
    buf[offset + 2] = w;
    buf[offset + 3] = h;
    buf[offset + 4] = uvX;
    buf[offset + 5] = uvY;
    buf[offset + 6] = uvW;
    buf[offset + 7] = uvH;
    buf[offset + 8] = this.tint[0];
    buf[offset + 9] = this.tint[1];
    buf[offset + 10] = this.tint[2];
    buf[offset + 11] = this.tint[3];
    buf[offset + 12] = -pos[1]; // negate Y for Y-sort: lower Y = further back
    buf[offset + 13] = 0;
  }

  /** @deprecated Fallback sort key when no layer name is set. */
  get sortKey(): number {
    return this.sortingLayer * 1e9 + (-this.#transform.worldPosition[1] + 1e6);
  }

  getSortKey(layerIndex: number): number {
    return layerIndex * 1e9 + (-this.#transform.worldPosition[1] + 1e6);
  }
}
