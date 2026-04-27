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
  /** Resolved texture, null until load completes. Plain field for hot-path reads. */
  texture: GfxTexture | null;
  /** Plain-field convenience mirror of `state.value === "ready"`. */
  isLoaded: boolean;
  /** Promise of the resolved texture — for `await` patterns. */
  ready: Promise<GfxTexture>;
  /** Reactive load state. Subscribe via `<Suspense pending={...}>` or watch(). */
  state: ReadonlyRef<LoadState>;
  /** Convenience: true while state is "loading". */
  loading: ReadonlyRef<boolean>;
  /** Last load error if state is "error". */
  error: ReadonlyRef<unknown | null>;
}

/** Must be called inside defineEntity() setup. */
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
