import type GfxBuffer from "../Buffer";
import type GfxVertexArray from "../VertexArray";
import WebGL2Buffer from "./WebGL2Buffer";

export default class WebGL2VertexArray implements GfxVertexArray {
  #gl: WebGL2RenderingContext;
  #vao: WebGLVertexArrayObject;

  constructor(gl: WebGL2RenderingContext) {
    this.#gl = gl;
    this.#vao = gl.createVertexArray()!;
  }

  bind(): void {
    this.#gl.bindVertexArray(this.#vao);
  }
  unbind(): void {
    this.#gl.bindVertexArray(null);
  }

  setVertexBuffer(
    location: number,
    buffer: GfxBuffer,
    size: number,
    options?: { normalized?: boolean; stride?: number; offset?: number; type?: "float" }
  ): void {
    const gl = this.#gl;
    const buf = buffer as WebGL2Buffer;
    this.bind();
    gl.bindBuffer(gl.ARRAY_BUFFER, (buf as any)._glBuffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(
      location,
      size,
      gl.FLOAT,
      options?.normalized ?? false,
      options?.stride ?? 0,
      options?.offset ?? 0
    );
    this.unbind();
  }

  setVertexBufferInstanced(
    location: number,
    buffer: GfxBuffer,
    size: number,
    divisor: number,
    options?: { normalized?: boolean; stride?: number; offset?: number; type?: "float" }
  ): void {
    const gl = this.#gl;
    const buf = buffer as WebGL2Buffer;
    this.bind();
    gl.bindBuffer(gl.ARRAY_BUFFER, (buf as any)._glBuffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(
      location,
      size,
      gl.FLOAT,
      options?.normalized ?? false,
      options?.stride ?? 0,
      options?.offset ?? 0
    );
    gl.vertexAttribDivisor(location, divisor);
    this.unbind();
  }

  setIndexBuffer(buffer: GfxBuffer): void {
    const gl = this.#gl;
    const buf = buffer as WebGL2Buffer;
    this.bind();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, (buf as any)._glBuffer);
    this.unbind();
  }

  dispose(): void {
    this.#gl.deleteVertexArray(this.#vao);
    // @ts-expect-error invalidate
    this.#vao = null;
  }
}
