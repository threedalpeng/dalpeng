import type GfxBuffer from "./Buffer";

export default interface GfxVertexArray {
  bind(): void;
  unbind(): void;
  setVertexBuffer(
    location: number,
    buffer: GfxBuffer,
    size: number,
    options?: { normalized?: boolean; stride?: number; offset?: number; type?: "float" }
  ): void;
  setIndexBuffer(buffer: GfxBuffer): void;
  dispose(): void;
}

