import { isNil } from "@/utils/basic";
import { loadProgram, loadShader } from "@/utils/gl";
import GLState from "./GLState";

export default class GLShader extends GLState {
  #program: WebGLProgram | null = null;
  gl!: WebGL2RenderingContext;
  static #shaderList = new Map<number, Shader>();

  constructor(gl: WebGL2RenderingContext, name = "") {
    super();
    this.gl = gl;
    this.name = name;
    Shader.#shaderList.set(this.id, this);
  }

  async loadFrom(vertexShaderSource: string, fragmentShaderSource: string) {
    if (isNil(this.#program)) {
      this.clear();
    }

    const shaders = await Promise.all([
      loadShader(
        this.gl,
        WebGL2RenderingContext.VERTEX_SHADER,
        vertexShaderSource
      )!,
      loadShader(
        this.gl,
        WebGL2RenderingContext.FRAGMENT_SHADER,
        fragmentShaderSource
      )!,
    ]);
    this.#program = loadProgram(this.gl, ...shaders);

    return this;
  }

  clear() {
    if (isNil(this.#program)) {
      this.gl.deleteProgram(this.#program);
      this.#program = null;
    }
  }

  getProgram() {
    return isNil(this.#program) ? null : this.#program;
  }

  getAttribLocation(name: string) {
    return this.gl.getAttribLocation(this.#program!, name);
  }

  getUniformLocation(name: string) {
    return this.gl.getUniformLocation(this.#program!, name);
  }

  use() {
    this.gl.useProgram(this.#program);
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
