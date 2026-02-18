import Entity from "@/entity/Entity";
import type Program from "@/gfx/Program";
import type { RendererBackend } from "@/gfx/RendererBackend";
import { isNil } from "@/utils/basic";

export default class Shader extends Entity {
  #program: Program | null = null;
  #backend!: RendererBackend;
  static #shaderList = new Map<number, Shader>();

  constructor(name = "") {
    super();
    this.name = name;
    Shader.#shaderList.set(this.id, this);
  }

  static create(name = "") {
    const newShader = new Shader(name);
    return newShader;
  }

  bindBackend(backend: RendererBackend) {
    this.#backend = backend;
    return this;
  }

  async loadFrom(vertexShaderSource: string, fragmentShaderSource: string) {
    if (!isNil(this.#program)) {
      this.clear();
    }

    this.#program = await this.#backend.createProgram(vertexShaderSource, fragmentShaderSource);

    return this;
  }

  clear() {
    if (this.#program) {
      this.#program.dispose();
      this.#program = null;
    }
  }

  getProgram() {
    return isNil(this.#program) ? null : this.#program;
  }

  getAttribLocation(name: string) {
    return this.#program!.getAttribLocation(name);
  }

  getUniformLocation(name: string) {
    // Deprecated for engine usage; prefer setUniform* helpers
    return this.#program!.getUniformLocation(name);
  }

  use() {
    this.#program?.use();
  }

  // Convenience uniform setters to keep Components backend-agnostic
  setUniformMat4(name: string, data: Float32List) {
    this.#program?.setUniformMat4(name, data);
  }
  setUniformVec3(name: string, data: Float32List) {
    this.#program?.setUniformVec3(name, data);
  }
  setUniformVec2(name: string, data: Float32List) {
    this.#program?.setUniformVec2(name, data);
  }
  setUniform1f(name: string, v: number) {
    this.#program?.setUniform1f(name, v);
  }
  setUniform1i(name: string, v: number) {
    this.#program?.setUniform1i(name, v);
  }

  static find(name: string) {
    let toFind;
    for (let [_, shader] of this.#shaderList) {
      if (shader.name === name) {
        toFind = shader;
        break;
      }
    }
    return toFind;
  }
  static forEach(callback: (shader: Shader) => void) {
    this.#shaderList.forEach(callback);
  }
}
