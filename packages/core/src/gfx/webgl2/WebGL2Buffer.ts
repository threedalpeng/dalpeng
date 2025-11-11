import type GfxBuffer from "../Buffer";
import type { BufferKind, BufferUsage } from "../Buffer";

export default class WebGL2Buffer implements GfxBuffer {
  readonly kind: BufferKind;
  #gl: WebGL2RenderingContext;
  #buffer: WebGLBuffer;
  byteLength = 0;

  constructor(gl: WebGL2RenderingContext, kind: BufferKind) {
    this.#gl = gl;
    this.kind = kind;
    this.#buffer = gl.createBuffer()!;
  }

  #target() {
    return this.kind === "vertex"
      ? this.#gl.ARRAY_BUFFER
      : this.#gl.ELEMENT_ARRAY_BUFFER;
  }

  update(data: ArrayBufferView, usage: BufferUsage = "static"): void {
    const gl = this.#gl;
    const target = this.#target();
    gl.bindBuffer(target, this.#buffer);
    const usageEnum =
      usage === "dynamic" ? gl.DYNAMIC_DRAW : usage === "stream" ? gl.STREAM_DRAW : gl.STATIC_DRAW;
    gl.bufferData(target, data, usageEnum);
    this.byteLength = data.byteLength;
  }

  get _glBuffer() {
    return this.#buffer;
  }

  dispose(): void {
    this.#gl.deleteBuffer(this.#buffer);
    // @ts-expect-error invalidate
    this.#buffer = null;
  }
}
