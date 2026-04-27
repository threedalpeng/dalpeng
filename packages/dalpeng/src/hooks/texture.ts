import {
  computed,
  ref,
  type GfxTexture,
  type ReadonlyRef,
  type TextureLoadOptions,
} from "@dalpeng/core";
import { requireEntity } from "../context";

export type LoadState = "loading" | "ready" | "error";

export interface TextureHandle {
  /** Plain-field hot-path read; null until ready. */
  texture: GfxTexture | null;
  /** Plain mirror of `state.value === "ready"`. */
  isLoaded: boolean;
  ready: Promise<GfxTexture>;
  state: ReadonlyRef<LoadState>;
  loading: ReadonlyRef<boolean>;
  error: ReadonlyRef<unknown | null>;
}

export function useTexture(url: string, opts?: TextureLoadOptions): TextureHandle {
  const entity = requireEntity("useTexture");
  const textures = entity.currentApp.textures;

  const state = ref<LoadState>("loading");
  const error = ref<unknown | null>(null);
  const loading = computed(() => state.value === "loading");

  const handle: TextureHandle = {
    texture: null,
    isLoaded: false,
    state,
    loading,
    error,
    ready: textures
      .load(url, opts)
      .then((tex) => {
        handle.texture = tex;
        handle.isLoaded = true;
        state.value = "ready";
        return tex;
      })
      .catch((err: unknown) => {
        error.value = err;
        state.value = "error";
        throw err;
      }),
  };

  return handle;
}
