import type { TextureLoadOptions } from "@dalpeng/core";
import { requireEntity } from "../context";

export interface TextureHandle {
  texture: any | null;
  isLoaded: boolean;
  ready: Promise<any>;
}

/** Must be called inside defineEntity() setup. */
export function useTexture(url: string, opts?: TextureLoadOptions): TextureHandle {
  const entity = requireEntity("useTexture");
  const textures = entity.currentApp.textures;

  const handle: TextureHandle = {
    texture: null,
    isLoaded: false,
    ready: textures.load(url, opts).then((tex: any) => {
      handle.texture = tex;
      handle.isLoaded = true;
      return tex;
    }),
  };

  return handle;
}
