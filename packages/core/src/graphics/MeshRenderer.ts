import type GameEntity from "@/entity/GameEntity";
import Transform from "../Transform";
import BaseRenderer from "./BaseRenderer";
import type Shader from "./Shader";

export default class MeshRenderer extends BaseRenderer {
  shader!: Shader;
  #modelUniformLocation!: WebGLUniformLocation;
  #vao!: WebGLVertexArrayObject;

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
  }

  get gl() {
    return this.context;
  }

  async setup() {
    this.transform = this.getComponent(Transform)!;

    const positionAttribLocation = this.shader.getAttribLocation("a_position");
    const normalAttribLocation = this.shader.getAttribLocation("a_normal");
    const texcoordAttribLocation = this.shader.getAttribLocation("a_texcoord");
    this.#modelUniformLocation = this.shader.getUniformLocation("u_model")!;

    this.#vao = this.gl.createVertexArray()!;
    this.gl.bindVertexArray(this.#vao);

    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.mesh.vertex.position,
      this.gl.STATIC_DRAW
    );
    this.gl.enableVertexAttribArray(positionAttribLocation);
    this.gl.vertexAttribPointer(
      positionAttribLocation,
      3,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    const normalBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normalBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.mesh.vertex.normal,
      this.gl.STATIC_DRAW
    );
    this.gl.enableVertexAttribArray(normalAttribLocation);
    this.gl.vertexAttribPointer(
      normalAttribLocation,
      3,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    const texcoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texcoordBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.mesh.vertex.texcoord,
      this.gl.STATIC_DRAW
    );
    this.gl.enableVertexAttribArray(texcoordAttribLocation);
    this.gl.vertexAttribPointer(
      texcoordAttribLocation,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    const indexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    this.gl.bufferData(
      this.gl.ELEMENT_ARRAY_BUFFER,
      this.mesh.index,
      this.gl.STATIC_DRAW
    );

    this.gl.bindVertexArray(null);
  }

  async render() {
    this.shader.use();

    //console.log(this.transform.getModelMatrix());
    this.gl.uniformMatrix4fv(
      this.#modelUniformLocation,
      false,
      this.transform.getModelMatrix()
    );

    this.gl.bindVertexArray(this.#vao);

    this.gl.drawElements(
      this.gl.TRIANGLES,
      this.mesh.index.length,
      this.gl.UNSIGNED_SHORT,
      0
    );
    this.gl.bindVertexArray(null);
  }
}
