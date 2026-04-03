import type { RendererBackend } from "../gfx/RendererBackend";
import type GfxTexture from "../gfx/Texture";
import type GfxSampler from "../gfx/Sampler";

export interface TextureLoadOptions {
  srgb?: boolean;
  mipmaps?: boolean;
}

export default class TextureManager {
  #renderer!: RendererBackend;
  #cache = new Map<string, GfxTexture>();
  #loading = new Map<string, Promise<GfxTexture>>();
  #placeholder!: GfxTexture;
  #defaultSampler!: GfxSampler;
  #initPromise: Promise<void>;
  #resolveInit!: () => void;

  constructor() {
    this.#initPromise = new Promise<void>((resolve) => {
      this.#resolveInit = resolve;
    });
  }

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

    this.#resolveInit();
  }

  get placeholder(): GfxTexture {
    return this.#placeholder;
  }

  get defaultSampler(): GfxSampler {
    return this.#defaultSampler;
  }

  async load(url: string, opts?: TextureLoadOptions): Promise<GfxTexture> {
    await this.#initPromise;
    if (this.#cache.has(url)) return this.#cache.get(url)!;
    if (this.#loading.has(url)) return this.#loading.get(url)!;

    const promise = this.#doLoad(url, opts ?? {});
    this.#loading.set(url, promise);
    const tex = await promise;
    this.#loading.delete(url);
    this.#cache.set(url, tex);
    return tex;
  }

  get(url: string): GfxTexture | undefined {
    return this.#cache.get(url);
  }

  async #doLoad(url: string, opts: TextureLoadOptions): Promise<GfxTexture> {
    const srgb = opts.srgb ?? true;
    const mipmaps = opts.mipmaps ?? true;

    const resp = await fetch(url);
    if (!resp.ok)
      throw new Error(`Failed to load texture: ${url} (${resp.status})`);

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
    for (const tex of this.#cache.values()) tex.dispose();
    this.#cache.clear();
    this.#loading.clear();
    this.#placeholder?.dispose();
    this.#defaultSampler?.dispose();
  }
}
