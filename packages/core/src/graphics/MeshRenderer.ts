import type GameEntity from "@/entity/GameEntity";
import type GfxVertexArray from "@/gfx/VertexArray";
import Transform from "../Transform";
import BaseRenderer from "./BaseRenderer";
import Material from "./Material";
import type Shader from "./Shader";

export default class MeshRenderer extends BaseRenderer {
  geometryShader!: Shader;
  shadowShader?: Shader;
  material = new Material();
  #vao!: GfxVertexArray;
  #shadowVao?: GfxVertexArray;

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
  }

  // No direct GL access; everything goes through the backend

  async setup() {
    super.setup();

    this.transform = this.getComponent(Transform)!;
    this.geometryShader = this.currentApp.shader.geometry;
    this.shadowShader = this.currentApp.shader.shadow;

    const positionAttribLocation = this.geometryShader.getAttribLocation("aPosition");
    const normalAttribLocation = this.geometryShader.getAttribLocation("aNormal");
    const texcoordAttribLocation = this.geometryShader.getAttribLocation("aTexcoord");

    const renderer = this.currentApp.renderer;
    this.#vao = renderer.createVertexArray();

    const positionBuffer = renderer.createBuffer("vertex");
    positionBuffer.update(this.mesh.vertex.position);
    this.#vao.setVertexBuffer(positionAttribLocation, positionBuffer, 3);

    const normalBuffer = renderer.createBuffer("vertex");
    normalBuffer.update(this.mesh.vertex.normal);
    this.#vao.setVertexBuffer(normalAttribLocation, normalBuffer, 3);

    if (texcoordAttribLocation >= 0) {
      const texcoordBuffer = renderer.createBuffer("vertex");
      texcoordBuffer.update(this.mesh.vertex.texcoord);
      this.#vao.setVertexBuffer(texcoordAttribLocation, texcoordBuffer, 2);
    }

    const indexBuffer = renderer.createBuffer("index");
    indexBuffer.update(this.mesh.index);
    this.#vao.setIndexBuffer(indexBuffer);

    // Optional second VAO for shadow program (attribute locations may differ)
    if (this.shadowShader) {
      const posLocShadow = this.shadowShader.getAttribLocation("aPosition");
      const vaoS = renderer.createVertexArray();
      const positionBufferS = renderer.createBuffer("vertex");
      positionBufferS.update(this.mesh.vertex.position);
      vaoS.setVertexBuffer(posLocShadow, positionBufferS, 3);
      const indexBufferS = renderer.createBuffer("index");
      indexBufferS.update(this.mesh.index);
      vaoS.setIndexBuffer(indexBufferS);
      this.#shadowVao = vaoS;
    }
  }

  async render() {
    this.geometryShader.setUniformMat4("uModel", this.transform.modelMatrix);
    this.geometryShader.setUniformVec3("uBaseColor", this.material.baseColor);
    this.geometryShader.setUniform1f("uMetallic", this.material.metallic);
    this.geometryShader.setUniform1f("uRoughness", this.material.roughness);
    this.geometryShader.setUniformVec3("uEmissive", this.material.emissive);

    this.currentApp.renderer.drawIndexed(this.#vao, {
      count: this.mesh.index.length,
      type: "uint16",
      mode: "triangles",
    });
  }

  renderShadow(lightViewProj: import("@dalpeng/math").Mat4) {
    if (!this.shadowShader || !this.#shadowVao) return;
    this.shadowShader.setUniformMat4("uModel", this.transform.modelMatrix);
    this.shadowShader.setUniformMat4("uLightViewProj", lightViewProj);
    this.currentApp.renderer.drawIndexed(this.#shadowVao, {
      count: this.mesh.index.length,
      type: "uint16",
      mode: "triangles",
    });
  }
}
