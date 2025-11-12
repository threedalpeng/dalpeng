import Component from "@/component/Component";
import Transform from "@/Transform";
import { dummyQuadForLight } from "@/utils/mesh";
import { Vec3 } from "@dalpeng/math";
import Shader from "./Shader";
import type GfxVertexArray from "@/gfx/VertexArray";

export type LightType = "directional" | "point" | "spot";
const LIGHT_TYPE_CODE = Object.freeze({
  directional: 0,
  point: 1,
  spot: 2,
});
const quadPos = dummyQuadForLight();

export default class Light extends Component {
  color = new Vec3([1, 1, 1]);
  type: LightType = "directional";
  intensity: number = 1;
  range: number = Infinity;
  transform!: Transform;
  lightingShader!: Shader;
  #vao!: GfxVertexArray;

  async setup() {
    super.setup();

    this.transform = this.getComponent(Transform)!;
    this.lightingShader = this.currentApp.shader.lighting;
    const positionAttribLocation =
      this.lightingShader.getAttribLocation("aPosition");

    const renderer = this.currentApp.renderer;
    this.#vao = renderer.createVertexArray();
    const positionBuffer = renderer.createBuffer("vertex");
    positionBuffer.update(quadPos);
    this.#vao.setVertexBuffer(positionAttribLocation, positionBuffer, 3);
  }

  renderLight() {
    const lightingShader = this.lightingShader;
    lightingShader.setUniformVec3("uLight.pos", this.transform.worldPosition);
    lightingShader.setUniformVec3("uLight.direction", this.transform.forward);
    lightingShader.setUniformVec3("uLight.color", this.color);
    lightingShader.setUniform1i("uLight.type", LIGHT_TYPE_CODE[this.type]);
    lightingShader.setUniform1f("uLight.intensity", this.intensity);

    this.currentApp.renderer.drawArrays(this.#vao, {
      mode: "triangle-strip",
      count: 4,
      first: 0,
    });
  }
}
