import { type Mat3 } from "@dalpeng/math";
import Component from "../component/Component";
import { Transform2D } from "../Transform";
import { getPerspective2D, getView2D } from "../utils/gl";
import Shader from "./Shader";

export class Camera2D extends Component {
  viewMatrix!: Mat3;
  projectionMatrix!: Mat3;
  aspectRatio = 1;
  size = 1;
  isFixedTo: "none" | "height" | "width" = "none";

  get gl() {
    return this.currentApp.gl;
  }
  get transform() {
    return this.getComponent(Transform2D)!;
  }

  async setup() {
    this.size = this.gl.canvas.height / 2;
    this.aspectRatio = this.gl.canvas.width / this.gl.canvas.height;
  }

  async update() {
    const transform = this.transform;
    this.aspectRatio = this.gl.canvas.width / this.gl.canvas.height;
    this.viewMatrix = getView2D(transform.position, transform.rotation);
    this.projectionMatrix = getPerspective2D(this.size, this.aspectRatio);
  }

  async cameraRender() {
    Shader.forEach((shader) => {
      shader.use();
      this.gl.uniformMatrix3fv(
        shader.getUniformLocation("u_view")!,
        false,
        this.viewMatrix
      );
      this.gl.uniformMatrix3fv(
        shader.getUniformLocation("u_projection")!,
        false,
        this.projectionMatrix
      );
    });
  }
}
