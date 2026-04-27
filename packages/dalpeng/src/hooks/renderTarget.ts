import type { GfxTexture, RenderTarget } from "@dalpeng/core";
import { requireEntity } from "../context";
import { onDestroy } from "./gameEntity";

export interface RenderTargetHandle {
  readonly texture: GfxTexture;
  readonly target: RenderTarget;
  readonly width: number;
  readonly height: number;
  /** Dispose old + recreate at new size. Consumers holding `.texture` must re-read. */
  resize(width: number, height: number): void;
  dispose(): void;
}

export interface RenderTargetOptions {
  format?: "rgba8unorm" | "srgba8unorm" | "rgba16f";
  depth?: boolean;
}

/** Allocate a GPU render target bound to the calling entity's lifetime. */
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
