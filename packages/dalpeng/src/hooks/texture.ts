import type { TextureLoadOptions } from "@dalpeng/core";
import { requireEntity } from "../context";

export interface TextureHandle {
  texture: any | null; // GfxTexture from the renderer backend
  isLoaded: boolean;
  ready: Promise<any>;
}

/**
 * Texture hook for game entities. Loads a texture and provides access to it.
 * The texture is loaded asynchronously; use `ready` to await completion
 * or check `isLoaded` / `texture` for synchronous access.
 *
 * Must be called inside defineGameEntity() setup.
 *
 * Usage:
 *   const tex = useTexture("/textures/stone_albedo.png");
 *   onStart(async () => {
 *     await tex.ready;
 *     renderer.material.baseColorMap = tex.texture;
 *   });
 */
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
