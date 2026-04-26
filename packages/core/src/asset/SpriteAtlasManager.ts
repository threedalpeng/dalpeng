import type { RendererBackend } from "../gfx/RendererBackend";
import SpriteAtlas, { type AtlasFrame } from "../graphics2d/SpriteAtlas";
import AssetCache from "./AssetCache";
import type TextureManager from "./TextureManager";

export default class SpriteAtlasManager {
  #textures!: TextureManager;
  // SpriteAtlas owns no GPU resource of its own (the texture is shared with
  // TextureManager) — disposer is a no-op. readyOnConstruct because the
  // upstream TextureManager carries its own init gate.
  readonly #cache = new AssetCache<SpriteAtlas>({ readyOnConstruct: true });

  init(_renderer: RendererBackend, textures: TextureManager): void {
    this.#textures = textures;
  }

  loadUniform(imageUrl: string, frameW: number, frameH: number): Promise<SpriteAtlas> {
    const key = `${imageUrl}?uniform&fw=${frameW}&fh=${frameH}`;
    return this.#cache.load(key, async () => {
      const tex = await this.#textures.load(imageUrl, { srgb: true, mipmaps: false });
      return SpriteAtlas.fromUniform(tex, tex.width, tex.height, frameW, frameH);
    });
  }

  loadFrames(imageUrl: string, frames: AtlasFrame[]): Promise<SpriteAtlas> {
    const key = `${imageUrl}?frames&n=${frames.length}&f0=${frames[0]?.name ?? ""}`;
    return this.#cache.load(key, async () => {
      const tex = await this.#textures.load(imageUrl, { srgb: true, mipmaps: false });
      return SpriteAtlas.fromFrames(tex, tex.width, tex.height, frames);
    });
  }

  /** Devtools introspection. Returns live entries — do not mutate. */
  entries(): Iterable<[string, SpriteAtlas]> {
    return this.#cache.entries();
  }

  /**
   * Release a cached atlas entry. The underlying texture is shared with
   * `TextureManager` and is NOT unloaded — free it separately via
   * `textures.unload(url)` if no other user holds a reference.
   */
  unload(key: string): boolean {
    return this.#cache.unload(key);
  }

  unloadAll(): void {
    this.#cache.unloadAll();
  }

  dispose(): void {
    this.#cache.dispose();
  }
}
