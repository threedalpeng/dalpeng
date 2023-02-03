import type GameEntity from "@/entity/GameEntity";
import Transform from "../Transform";
import BaseRenderer from "./BaseRenderer";
import Material from "./Material";
import type Shader from "./Shader";

export default class MeshRenderer extends BaseRenderer {
  geometryShader!: Shader;
  material = new Material();
  #modelUniformLocation!: WebGLUniformLocation;
  #baseColorUniformLocation!: WebGLUniformLocation;
  #metallicUniformLocation!: WebGLUniformLocation;
  #roughnessUniformLocation!: WebGLUniformLocation;
  #emissiveUniformLocation!: WebGLUniformLocation;
  #vao!: WebGLVertexArrayObject;

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
  }

  get gl() {
    if (!this.context) this.context = this.gameEntity.currentApp.context;
    return this.context;
  }

  async setup() {
    super.setup();

    this.transform = this.getComponent(Transform)!;
    this.geometryShader = this.currentApp.shader.geometry;

    const positionAttribLocation =
      this.geometryShader.getAttribLocation("aPosition");
    const normalAttribLocation =
      this.geometryShader.getAttribLocation("aNormal");
    const texcoordAttribLocation =
      this.geometryShader.getAttribLocation("aTexcoord");
    this.#modelUniformLocation =
      this.geometryShader.getUniformLocation("uModel")!;
    this.#baseColorUniformLocation =
      this.geometryShader.getUniformLocation("uBaseColor")!;
    this.#metallicUniformLocation =
      this.geometryShader.getUniformLocation("uMetallic")!;
    this.#roughnessUniformLocation =
      this.geometryShader.getUniformLocation("uRoughness")!;
    this.#emissiveUniformLocation =
      this.geometryShader.getUniformLocation("uEmissive")!;

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

    if (texcoordAttribLocation >= 0) {
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
    }

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
    this.gl.uniformMatrix4fv(
      this.#modelUniformLocation,
      false,
      this.transform.modelMatrix
    );
    this.gl.uniform3fv(this.#baseColorUniformLocation, this.material.baseColor);
    this.gl.uniform1f(this.#metallicUniformLocation, this.material.metallic);
    this.gl.uniform1f(this.#roughnessUniformLocation, this.material.roughness);
    this.gl.uniform3fv(this.#emissiveUniformLocation, this.material.emissive);

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
