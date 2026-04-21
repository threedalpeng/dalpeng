import type { GfxTexture, TextureLoadOptions } from "@dalpeng/core";
import { requireEntity } from "../context";

export interface TextureHandle {
  texture: GfxTexture | null;
  isLoaded: boolean;
  ready: Promise<GfxTexture>;
}

/** Must be called inside defineEntity() setup. */
export function useTexture(url: string, opts?: TextureLoadOptions): TextureHandle {
  const entity = requireEntity("useTexture");
  const textures = entity.currentApp.textures;

  const handle: TextureHandle = {
    texture: null,
    isLoaded: false,
    ready: textures.load(url, opts).then((tex) => {
      handle.texture = tex;
      handle.isLoaded = true;
      return tex;
    }),
  };

  return handle;
}
