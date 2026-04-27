import type { GfxTexture, RenderTarget } from "@dalpeng/core";
import { requireEntity } from "../context";
import { onDestroy } from "./gameEntity";

export interface RenderTargetHandle {
  /** Color attachment 0 — the texture other materials sample from. */
  readonly texture: GfxTexture;
  /** Underlying engine render target. Pass to pipeline passes that target an RT. */
  readonly target: RenderTarget;
  /** Current width in pixels (drawable units). */
  readonly width: number;
  /** Current height in pixels (drawable units). */
  readonly height: number;
  /**
   * Recreate the target at a new size. Existing texture/target are disposed
   * and replaced; consumers holding `.texture` references must re-read.
   */
  resize(width: number, height: number): void;
  /** Dispose now. Auto-called on entity destroy if used inside defineEntity. */
  dispose(): void;
}

export interface RenderTargetOptions {
  /** Texture format for the color attachment. Defaults to "rgba8unorm". */
  format?: "rgba8unorm" | "srgba8unorm" | "rgba16f";
  /** Allocate a depth attachment alongside the color. Defaults to false. */
  depth?: boolean;
}

/**
 * Allocate a GPU render target sized `width × height` and bind its lifetime
 * to the calling entity. The returned `texture` can be sampled by other
 * materials (mini-map, mirror, in-game CCTV, etc.).
 *
 * Pipeline integration — having a Camera render INTO this target — is a
 * separate concern and lands in a follow-up. For now the handle lets users
 * own the GPU resource lifecycle through dalpeng's hook discipline; advanced
 * code can drive the renderer manually against `target`.
 */
export function useRenderTarget(
  width: number,
  height: number,
  opts: RenderTargetOptions = {}
): RenderTargetHandle {
  const entity = requireEntity("useRenderTarget");
  const renderer = entity.currentApp.renderer;
  const format = opts.format ?? "rgba8unorm";
  const depth = opts.depth ?? false;

  const make = (
    w: number,
    h: number
  ): { texture: GfxTexture; depthTex: GfxTexture | undefined; target: RenderTarget } => {
    const texture = renderer.createTexture({
      kind: "2d",
      width: w,
      height: h,
      format,
    });
    const depthTex = depth
      ? renderer.createTexture({ kind: "2d", width: w, height: h, format: "depth24" })
      : undefined;
    const target = renderer.createRenderTarget({
      width: w,
      height: h,
      colorAttachments: [texture],
      depthAttachment: depthTex,
    });
    return { texture, depthTex, target };
  };

  let current = make(width, height);
  let disposed = false;

  const handle: RenderTargetHandle = {
    get texture() {
      return current.texture;
    },
    get target() {
      return current.target;
    },
    get width() {
      return current.target.width;
    },
    get height() {
      return current.target.height;
    },
    resize(w, h) {
      if (disposed) return;
      if (w === current.target.width && h === current.target.height) return;
      renderer.destroyRenderTarget(current.target);
      current.texture.dispose();
      current.depthTex?.dispose();
      current = make(w, h);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.destroyRenderTarget(current.target);
      current.texture.dispose();
      current.depthTex?.dispose();
    },
  };

  onDestroy(() => handle.dispose());
  return handle;
}
