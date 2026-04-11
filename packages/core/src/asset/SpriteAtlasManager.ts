import type { RendererBackend } from "../gfx/RendererBackend";
import SpriteAtlas, { type AtlasFrame } from "../graphics2d/SpriteAtlas";
import type TextureManager from "./TextureManager";

export default class SpriteAtlasManager {
  #textures!: TextureManager;
  #cache = new Map<string, SpriteAtlas>();
  #loading = new Map<string, Promise<SpriteAtlas>>();

  init(_renderer: RendererBackend, textures: TextureManager): void {
    this.#textures = textures;
  }

  async loadUniform(imageUrl: string, frameW: number, frameH: number): Promise<SpriteAtlas> {
    const key = `${imageUrl}?uniform&fw=${frameW}&fh=${frameH}`;
    if (this.#cache.has(key)) return this.#cache.get(key)!;
    if (this.#loading.has(key)) return this.#loading.get(key)!;

    const promise = this.#doLoadUniform(imageUrl, frameW, frameH);
    this.#loading.set(key, promise);
    const atlas = await promise;
    this.#loading.delete(key);
    this.#cache.set(key, atlas);
    return atlas;
  }

  async #doLoadUniform(imageUrl: string, frameW: number, frameH: number): Promise<SpriteAtlas> {
    const tex = await this.#textures.load(imageUrl, { srgb: true, mipmaps: false });
    return SpriteAtlas.fromUniform(tex, tex.width, tex.height, frameW, frameH);
  }

  async loadFrames(imageUrl: string, frames: AtlasFrame[]): Promise<SpriteAtlas> {
    const key = `${imageUrl}?frames&n=${frames.length}&f0=${frames[0]?.name ?? ""}`;
    if (this.#cache.has(key)) return this.#cache.get(key)!;
    if (this.#loading.has(key)) return this.#loading.get(key)!;

    const promise = this.#doLoadFrames(imageUrl, frames);
    this.#loading.set(key, promise);
    const atlas = await promise;
    this.#loading.delete(key);
    this.#cache.set(key, atlas);
    return atlas;
  }

  async #doLoadFrames(imageUrl: string, frames: AtlasFrame[]): Promise<SpriteAtlas> {
    const tex = await this.#textures.load(imageUrl, { srgb: true, mipmaps: false });
    return SpriteAtlas.fromFrames(tex, tex.width, tex.height, frames);
  }

  dispose(): void {
    this.#cache.clear();
    this.#loading.clear();
  }
}
