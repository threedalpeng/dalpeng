import Component from "@/ecs/Component";
import Transform from "@/ecs/Transform";
import { Vec3 } from "@dalpeng/math";
import Shader from "./Shader";

export type LightType = "directional" | "point" | "spot";
const LIGHT_TYPE_CODE = Object.freeze({
  directional: 0,
  point: 1,
  spot: 2,
});

export default class Light extends Component {
  color = new Vec3([1, 1, 1]);
  type: LightType = "directional";
  intensity: number = 1;
  range: number = Infinity;
  innerConeAngle: number = 0;
  outerConeAngle: number = Math.PI / 4;
  transform!: Transform;
  lightingShader!: Shader;

  async setup() {
    super.setup();
    this.transform = this.getComponent(Transform)!;
    this.lightingShader = this.currentApp.shader.lighting;
  }

  renderLight() {
    const quad = this.currentApp.lightingQuad;
    if (!quad) return;
    const lightingShader = this.lightingShader;
    lightingShader.setUniformVec3("uLight.pos", this.transform.worldPosition);
    lightingShader.setUniformVec3("uLight.direction", this.transform.forward);
    lightingShader.setUniformVec3("uLight.color", this.color);
    lightingShader.setUniform1i("uLight.type", LIGHT_TYPE_CODE[this.type]);
    lightingShader.setUniform1f("uLight.intensity", this.intensity);
    lightingShader.setUniform1f("uLight.cosInnerAngle", Math.cos(this.innerConeAngle));
    lightingShader.setUniform1f("uLight.cosOuterAngle", Math.cos(this.outerConeAngle));

    this.currentApp.renderer.drawArrays(quad, {
      mode: "triangle-strip",
      count: 4,
      first: 0,
    });
  }
}
