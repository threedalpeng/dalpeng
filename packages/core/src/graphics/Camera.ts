import Component from "@/component/Component";
import Transform from "@/Transform";
import { Mat4, Vec3 } from "@dalpeng/math";

export default class Camera extends Component {
  viewMatrix!: Mat4;
  projectionMatrix!: Mat4;
  aspectRatio = 1;

  isOrthographic = false;
  size = 1;

  fovy = Math.PI / 4.0;
  dNear = 1.0;
  dFar = 1000.0;

  eye = new Vec3([0, 0, 0]);
  at = new Vec3([0, 0, 0]);
  up = new Vec3([0, 1, 0]);

  get gl() {
    return this.currentApp.gl;
  }
  get transform() {
    return this.getComponent(Transform)!;
  }

  async setup() {
    super.setup();

    this.size = 4;
    this.aspectRatio = this.gl.canvas.width / this.gl.canvas.height;
  }

  async update() {
    const transform = this.transform;
    this.eye = transform.position;

    this.aspectRatio = this.gl.canvas.width / this.gl.canvas.height;
    this.viewMatrix = Mat4.view(this.eye, this.at, this.up);
    if (this.isOrthographic) {
      this.projectionMatrix = Mat4.orthographic(
        this.size * this.aspectRatio,
        this.size,
        this.dNear,
        this.dFar
      );
    } else {
      this.projectionMatrix = Mat4.perspective(
        this.fovy,
        this.aspectRatio,
        this.dNear,
        this.dFar
      );
    }
  }

  async renderCameraToGeometry() {
    const shader = this.currentApp.shader.geometry;
    this.gl.uniformMatrix4fv(
      shader.getUniformLocation("uView")!,
      false,
      this.viewMatrix
    );
    this.gl.uniformMatrix4fv(
      shader.getUniformLocation("uProjection")!,
      false,
      this.projectionMatrix
    );
  }

  async renderCameraToLighting() {
    const shader = this.currentApp.shader.lighting;
    this.gl.uniform3fv(
      shader.getUniformLocation("uViewPos")!,
      this.transform.worldPosition
    );
  }
}
