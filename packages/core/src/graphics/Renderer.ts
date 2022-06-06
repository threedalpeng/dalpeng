import Component from "../component/Component";
import { Mat3 } from "@dalpeng/math";
import WebGLShader from "./Shader";
import { Transform2D } from "../Transform";
import GameEntity from "../entity/GameEntity";

type WebGraphicContext = WebGL2RenderingContext | GPUCanvasContext;

export class BaseRenderer extends Component {
  context!: WebGraphicContext;
  mesh!: { position: ArrayBufferLike; color: ArrayBufferLike };
  transform!: Transform2D;

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
    this.context = gameEntity.scene.app.context;
  }

  async setup() {}
  async render() {}
}

export class MeshRenderer2D extends BaseRenderer {
  declare context: WebGL2RenderingContext;
  shader!: WebGLShader;
  #modelUniformLocation!: WebGLUniformLocation;
  #projectionUniformLocation!: WebGLUniformLocation;
  #vao!: WebGLVertexArrayObject;

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
  }

  get gl() {
    return this.context;
  }

  async setup() {
    this.transform = this.getComponent(Transform2D)!;

    const colorAttribLocation = this.shader.getAttribLocation("a_color");
    const positionAttribLocation = this.shader.getAttribLocation("a_position");
    this.#modelUniformLocation = this.shader.getUniformLocation("u_model")!;
    this.#projectionUniformLocation =
      this.shader.getUniformLocation("u_projection")!;

    this.#vao = this.gl.createVertexArray()!;
    this.gl.bindVertexArray(this.#vao);

    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.mesh.position,
      this.gl.STATIC_DRAW
    );
    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(
      positionAttribLocation,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    const colorBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.mesh.color,
      this.gl.STATIC_DRAW
    );
    this.gl.enableVertexAttribArray(1);
    this.gl.vertexAttribPointer(
      colorAttribLocation,
      3,
      this.gl.UNSIGNED_BYTE,
      true,
      0,
      0
    );
    this.gl.bindVertexArray(null);
  }

  async render() {
    this.shader.use();

    this.gl.uniformMatrix3fv(
      this.#modelUniformLocation,
      false,
      this.transform.getModelMatrix()
    );
    this.gl.uniformMatrix3fv(
      this.#projectionUniformLocation,
      false,
      new Mat3([
        2 / this.gl.canvas.width,
        0,
        0,
        0,
        -2 / this.gl.canvas.height,
        0,
        -1,
        1,
        1,
      ])
    );

    this.gl.bindVertexArray(this.#vao);

    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.mesh.position.byteLength / 8);
    this.gl.bindVertexArray(null);
  }
}
