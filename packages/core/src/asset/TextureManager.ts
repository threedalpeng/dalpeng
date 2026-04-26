import type { RendererBackend } from "../gfx/RendererBackend";
import type GfxSampler from "../gfx/Sampler";
import type GfxTexture from "../gfx/Texture";
import AssetCache from "./AssetCache";

export interface TextureLoadOptions {
  srgb?: boolean;
  mipmaps?: boolean;
}

export default class TextureManager {
  #renderer!: RendererBackend;
  readonly #cache = new AssetCache<GfxTexture>({
    dispose: (tex) => tex.dispose(),
  });
  #placeholder!: GfxTexture;
  #defaultSampler!: GfxSampler;

  init(renderer: RendererBackend): void {
    this.#renderer = renderer;

    const tex = renderer.createTexture!({
      kind: "2d",
      width: 1,
      height: 1,
      format: "rgba8unorm",
    });
    tex.update2D(new Uint8Array([255, 255, 255, 255]));
    this.#placeholder = tex;

    this.#defaultSampler = renderer.createSampler!({
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat",
      maxAnisotropy: 4,
    });

    this.#cache.markReady();
  }

  get placeholder(): GfxTexture {
    return this.#placeholder;
  }

  get defaultSampler(): GfxSampler {
    return this.#defaultSampler;
  }

  load(url: string, opts?: TextureLoadOptions): Promise<GfxTexture> {
    return this.#cache.load(url, () => this.#doLoad(url, opts ?? {}));
  }

  get(url: string): GfxTexture | undefined {
    return this.#cache.get(url);
  }

  /** Devtools introspection. Returns live entries — do not mutate. */
  entries(): Iterable<[string, GfxTexture]> {
    return this.#cache.entries();
  }

  /**
   * Release the texture for `url` and remove it from the cache. Safe to call
   * even if the URL was never loaded. Returns `true` if a texture was freed.
   *
   * Callers are responsible for ensuring no live renderer still references
   * this texture — the engine has no ref counting.
   */
  unload(url: string): boolean {
    return this.#cache.unload(url);
  }

  /** Release every cached texture. Does NOT touch the placeholder/sampler. */
  unloadAll(): void {
    this.#cache.unloadAll();
  }

  async #doLoad(url: string, opts: TextureLoadOptions): Promise<GfxTexture> {
    const srgb = opts.srgb ?? true;
    const mipmaps = opts.mipmaps ?? true;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to load texture: ${url} (${resp.status})`);

    const blob = await resp.blob();
    const bitmap = await createImageBitmap(blob, {
      colorSpaceConversion: "none",
      premultiplyAlpha: "none",
    });

    const format = srgb ? "srgba8unorm" : "rgba8unorm";
    const tex = this.#renderer.createTexture!({
      kind: "2d",
      width: bitmap.width,
      height: bitmap.height,
      format,
      mipLevels: mipmaps ? 0 : 1,
    });
    tex.update2D(bitmap);
    if (mipmaps) tex.generateMipmaps?.();
    bitmap.close();
    return tex;
  }

  dispose(): void {
    this.#cache.dispose();
    this.#placeholder?.dispose();
    this.#defaultSampler?.dispose();
  }
}
