import Component from "@/component/Component";
import Transform from "@/Transform";
import { dummyQuadForLight } from "@/utils/mesh";
import { Vec3 } from "@dalpeng/math";
import Shader from "./Shader";

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
  #vao!: WebGLVertexArrayObject;

  async setup() {
    super.setup();

    this.transform = this.getComponent(Transform)!;
    this.lightingShader = this.currentApp.shader.lighting;
    const positionAttribLocation =
      this.lightingShader.getAttribLocation("aPosition");

    const gl = this.lightingShader.gl;
    this.#vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.#vao);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadPos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttribLocation);
    gl.vertexAttribPointer(positionAttribLocation, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  renderLight() {
    const lightingShader = this.lightingShader;
    const lightPosLocation = lightingShader.getUniformLocation("uLight.pos");
    const lightDirectionLocation =
      lightingShader.getUniformLocation("uLight.direction");
    const lightColorLocation =
      lightingShader.getUniformLocation("uLight.color");
    const lightTypeLocation = lightingShader.getUniformLocation("uLight.type");
    const lightIntensityLocation =
      lightingShader.getUniformLocation("uLight.intensity");
    lightingShader.gl.uniform3fv(
      lightPosLocation,
      this.transform.worldPosition
    );
    lightingShader.gl.uniform3fv(
      lightDirectionLocation,
      this.transform.worldRotation.mulv([0, 0, -1])
    );
    lightingShader.gl.uniform3fv(lightColorLocation, this.color);
    lightingShader.gl.uniform1i(lightTypeLocation, LIGHT_TYPE_CODE[this.type]);
    lightingShader.gl.uniform1f(lightIntensityLocation, this.intensity);

    lightingShader.gl.bindVertexArray(this.#vao);
    lightingShader.gl.drawArrays(lightingShader.gl.TRIANGLE_STRIP, 0, 4);
    lightingShader.gl.bindVertexArray(null);
  }
}
