import type GameEntity from "@/ecs/GameEntity";
import type GfxVertexArray from "@/gfx/VertexArray";
import Transform from "../ecs/Transform";
import BaseRenderer from "./BaseRenderer";
import Material from "./Material";
import type Shader from "./Shader";
import type Skeleton from "@/animation/Skeleton";

export default class SkinnedMeshRenderer extends BaseRenderer {
  geometryShader!: Shader;
  shadowShader?: Shader;
  material = new Material();
  skeleton!: Skeleton;
  jointsData!: Uint8Array | Uint16Array;
  weightsData!: Float32Array;
  #vao!: GfxVertexArray;
  #shadowVao?: GfxVertexArray;
  #indexType: "uint16" | "uint32" = "uint16";

  constructor(gameEntity: GameEntity) {
    super(gameEntity);
  }

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

    // Optional tangent buffer (vec4: xyz + w handedness)
    const tangentAttribLocation = this.geometryShader.getAttribLocation("aTangent");
    if (tangentAttribLocation >= 0 && this.mesh.vertex.tangent) {
      const tangentBuffer = renderer.createBuffer("vertex");
      tangentBuffer.update(this.mesh.vertex.tangent);
      this.#vao.setVertexBuffer(tangentAttribLocation, tangentBuffer, 4);
      this.material.hasTangent = true;
    }

    // Joints buffer (converted to float to avoid integer/float generic attribute type mismatch)
    const jointsAttribLocation = this.geometryShader.getAttribLocation("aJoints");
    if (jointsAttribLocation >= 0) {
      const jointsFloat = new Float32Array(this.jointsData.length);
      for (let i = 0; i < this.jointsData.length; i++) jointsFloat[i] = this.jointsData[i];
      const jointsBuffer = renderer.createBuffer("vertex");
      jointsBuffer.update(jointsFloat);
      this.#vao.setVertexBuffer(jointsAttribLocation, jointsBuffer, 4);
    }

    // Weights buffer
    const weightsAttribLocation = this.geometryShader.getAttribLocation("aWeights");
    if (weightsAttribLocation >= 0) {
      const weightsBuffer = renderer.createBuffer("vertex");
      weightsBuffer.update(this.weightsData);
      this.#vao.setVertexBuffer(weightsAttribLocation, weightsBuffer, 4);
    }

    const indexBuffer = renderer.createBuffer("index");
    indexBuffer.update(this.mesh.index);
    this.#vao.setIndexBuffer(indexBuffer);
    this.#indexType = this.mesh.index instanceof Uint32Array ? "uint32" : "uint16";

    // Optional second VAO for shadow program (attribute locations may differ)
    if (this.shadowShader) {
      const posLocShadow = this.shadowShader.getAttribLocation("aPosition");
      const vaoS = renderer.createVertexArray();
      const positionBufferS = renderer.createBuffer("vertex");
      positionBufferS.update(this.mesh.vertex.position);
      vaoS.setVertexBuffer(posLocShadow, positionBufferS, 3);

      // Joints buffer for shadow VAO (float conversion)
      const jointsLocShadow = this.shadowShader.getAttribLocation("aJoints");
      if (jointsLocShadow >= 0) {
        const jointsFloatS = new Float32Array(this.jointsData.length);
        for (let i = 0; i < this.jointsData.length; i++) jointsFloatS[i] = this.jointsData[i];
        const jointsBufferS = renderer.createBuffer("vertex");
        jointsBufferS.update(jointsFloatS);
        vaoS.setVertexBuffer(jointsLocShadow, jointsBufferS, 4);
      }

      const weightsLocShadow = this.shadowShader.getAttribLocation("aWeights");
      if (weightsLocShadow >= 0) {
        const weightsBufferS = renderer.createBuffer("vertex");
        weightsBufferS.update(this.weightsData);
        vaoS.setVertexBuffer(weightsLocShadow, weightsBufferS, 4);
      }

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

    // Alpha mode
    this.geometryShader.setUniform1i("uAlphaMode", this.material.alphaMode === "MASK" ? 1 : 0);
    this.geometryShader.setUniform1f("uAlphaCutoff", this.material.alphaCutoff);

    // Unlit
    this.geometryShader.setUniform1i("uUnlit", this.material.unlit ? 1 : 0);

    // Occlusion strength
    this.geometryShader.setUniform1f("uOcclusionStrength", this.material.occlusionStrength);

    // Texture transform (KHR_texture_transform)
    this.geometryShader.setUniformMat3("uTexTransform", this.material.texTransform);

    // Texture flags: apply texture mask to bits 0-3, preserve HAS_TANGENT (bit 4) and OCCLUSION (bit 5) unconditionally
    const texMask = this.currentApp.features.textureMask ?? 0xF;
    const maskedTexBits = this.material.texFlags & texMask & 0xF;
    const keepBits = this.material.texFlags & ~0xF; // bits 4+ (HAS_TANGENT, OCCLUSION)
    this.geometryShader.setUniform1i("uTexFlags", maskedTexBits | keepBits);

    const textures = this.currentApp.textures;
    const placeholder = textures.placeholder;
    const sampler = textures.defaultSampler;

    const baseColorTex = this.material.baseColorMap ?? placeholder;
    const normalTex = this.material.normalMap ?? placeholder;
    const mrTex = this.material.metallicRoughnessMap ?? placeholder;
    const emissiveTex = this.material.emissiveMap ?? placeholder;
    const occlusionTex = this.material.occlusionMap ?? placeholder;

    baseColorTex.bind!(0);
    normalTex.bind!(1);
    mrTex.bind!(2);
    emissiveTex.bind!(3);
    occlusionTex.bind!(4);

    sampler.bind!(0);
    sampler.bind!(1);
    sampler.bind!(2);
    sampler.bind!(3);
    sampler.bind!(4);

    // Skinning uniforms
    this.geometryShader.setUniform1i("uSkinned", 1);
    this.geometryShader.setUniformMat4Array("uJointMatrices", this.skeleton.jointMatrices, this.skeleton.jointCount);

    // doubleSided: disable cull face for this draw call
    if (this.material.doubleSided) {
      this.currentApp.renderer.setCullFace?.(false);
    }

    this.currentApp.renderer.drawIndexed(this.#vao, {
      count: this.mesh.index.length,
      type: this.#indexType,
      mode: "triangles",
    });

    // Restore skinning flag
    this.geometryShader.setUniform1i("uSkinned", 0);

    // Restore cull face
    if (this.material.doubleSided) {
      this.currentApp.renderer.setCullFace?.(true);
    }

    // Unbind samplers to avoid contaminating lighting pass
    sampler.unbind!(0);
    sampler.unbind!(1);
    sampler.unbind!(2);
    sampler.unbind!(3);
    sampler.unbind!(4);
  }

  renderShadow(lightViewProj: import("@dalpeng/math").Mat4) {
    if (!this.shadowShader || !this.#shadowVao) return;
    this.shadowShader.setUniformMat4("uModel", this.transform.modelMatrix);
    this.shadowShader.setUniformMat4("uLightViewProj", lightViewProj);

    // Skinning uniforms for shadow pass
    this.shadowShader.setUniform1i("uSkinned", 1);
    this.shadowShader.setUniformMat4Array("uJointMatrices", this.skeleton.jointMatrices, this.skeleton.jointCount);

    this.currentApp.renderer.drawIndexed(this.#shadowVao, {
      count: this.mesh.index.length,
      type: this.#indexType,
      mode: "triangles",
    });

    // Restore skinning flag
    this.shadowShader.setUniform1i("uSkinned", 0);
  }
}
