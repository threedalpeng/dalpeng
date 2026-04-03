import type Program from "../Program";

export default class WebGL2Program implements Program {
  constructor(
    private readonly gl: WebGL2RenderingContext,
    private program: WebGLProgram
  ) {}

  #uniformCache: Map<string, WebGLUniformLocation | null> = new Map();
  #getLocation(name: string): WebGLUniformLocation | null {
    if (this.#uniformCache.has(name)) return this.#uniformCache.get(name)!;
    const loc = this.gl.getUniformLocation(this.program, name);
    this.#uniformCache.set(name, loc);
    return loc;
  }

  use(): void {
    this.gl.useProgram(this.program);
  }

  getAttribLocation(name: string): number {
    return this.gl.getAttribLocation(this.program, name);
  }

  getUniformLocation(name: string): unknown {
    return this.#getLocation(name);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
    // @ts-expect-error invalidate
    this.program = null;
  }

  setUniformMat4(name: string, data: Float32List): void {
    const loc = this.#getLocation(name);
    if (loc) this.gl.uniformMatrix4fv(loc, false, data as unknown as Float32Array);
  }
  setUniformMat3(name: string, data: Float32List): void {
    const loc = this.#getLocation(name);
    if (loc) this.gl.uniformMatrix3fv(loc, false, data as unknown as Float32Array);
  }
  setUniformVec3(name: string, data: Float32List): void {
    const loc = this.#getLocation(name);
    if (loc) this.gl.uniform3fv(loc, data as unknown as Float32Array);
  }
  setUniformVec2(name: string, data: Float32List): void {
    const loc = this.#getLocation(name);
    if (loc) this.gl.uniform2fv(loc, data as unknown as Float32Array);
  }
  setUniform1f(name: string, v: number): void {
    const loc = this.#getLocation(name);
    if (loc) this.gl.uniform1f(loc, v);
  }
  setUniform1i(name: string, v: number): void {
    const loc = this.#getLocation(name);
    if (loc) this.gl.uniform1i(loc, v);
  }
  setUniformMat4Array(name: string, data: Float32Array, count: number): void {
    const loc = this.#getLocation(name + '[0]');
    if (loc) this.gl.uniformMatrix4fv(loc, false, data.subarray(0, count * 16));
  }
}
