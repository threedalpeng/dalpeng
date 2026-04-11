import type GfxTexture from "../gfx/Texture";

export interface AtlasFrame {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export default class SpriteAtlas {
  #texture: GfxTexture;
  #frames: Map<string | number, Float32Array>; // [uvX, uvY, uvW, uvH] normalized
  framePixelWidth = 0;
  framePixelHeight = 0;

  constructor(texture: GfxTexture) {
    this.#texture = texture;
    this.#frames = new Map();
  }

  get texture(): GfxTexture { return this.#texture; }
  get frameCount(): number { return this.#frames.size; }

  getUV(frame: number | string): Float32Array {
    const uv = this.#frames.get(frame);
    if (!uv) throw new Error(`SpriteAtlas: frame "${frame}" not found`);
    return uv;
  }

  hasFrame(frame: number | string): boolean {
    return this.#frames.has(frame);
  }

  static fromUniform(texture: GfxTexture, texWidth: number, texHeight: number, frameW: number, frameH: number): SpriteAtlas {
    const atlas = new SpriteAtlas(texture);
    atlas.framePixelWidth = frameW;
    atlas.framePixelHeight = frameH;
    const cols = Math.floor(texWidth / frameW);
    const rows = Math.floor(texHeight / frameH);
    const uvW = frameW / texWidth;
    const uvH = frameH / texHeight;
    let index = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        atlas.#frames.set(index, new Float32Array([
          col * uvW,
          row * uvH,
          uvW,
          uvH,
        ]));
        index++;
      }
    }
    return atlas;
  }

  static fromFrames(texture: GfxTexture, texWidth: number, texHeight: number, frames: AtlasFrame[]): SpriteAtlas {
    const atlas = new SpriteAtlas(texture);
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const uv = new Float32Array([
        f.x / texWidth,
        f.y / texHeight,
        f.w / texWidth,
        f.h / texHeight,
      ]);
      atlas.#frames.set(f.name, uv);
      atlas.#frames.set(i, uv);
    }
    return atlas;
  }
}
