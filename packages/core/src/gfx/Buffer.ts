export type BufferUsage = "static" | "dynamic" | "stream";
export type BufferKind = "vertex" | "index";

export default interface GfxBuffer {
  readonly kind: BufferKind;
  readonly byteLength: number;
  update(data: ArrayBufferView, usage?: BufferUsage): void;
  dispose(): void;
}
