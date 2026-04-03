import Component from "@/ecs/Component";
import Transform from "@/ecs/Transform";
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

  get transform() {
    return this.getComponent(Transform)!;
  }

  async setup() {
    super.setup();

    const size = this.currentApp.renderer.getDrawableSize();
    this.aspectRatio = size.width / size.height;
  }

  async update() {
    const transform = this.transform;
    this.eye = transform.worldPosition;
    this.at = this.eye.add(transform.forward);
    this.up = transform.up;

    const size = this.currentApp.renderer.getDrawableSize();
    this.aspectRatio = size.width / size.height;
    this.viewMatrix = Mat4.view(this.eye, this.at, this.up);
    if (this.isOrthographic) {
      this.projectionMatrix = Mat4.orthographic(
        this.size * this.aspectRatio,
        this.size,
        this.dNear,
        this.dFar
      );
    } else {
      this.projectionMatrix = Mat4.perspective(this.fovy, this.aspectRatio, this.dNear, this.dFar);
    }
  }

  get glProjectionMatrix(): Mat4 {
    return Mat4.toWebGL(this.projectionMatrix);
  }

  async renderCameraToGeometry() {
    const shader = this.currentApp.shader.geometry;
    shader.setUniformMat4("uView", this.viewMatrix);
    shader.setUniformMat4("uProjection", this.glProjectionMatrix);
  }

  async renderCameraToLighting() {
    const shader = this.currentApp.shader.lighting;
    shader.setUniformVec3("uViewPos", this.transform.worldPosition);
  }

  setOrthographic(size: number): this {
    this.isOrthographic = true;
    this.size = size;
    return this;
  }

  setPerspective(fov: number): this {
    this.isOrthographic = false;
    this.fovy = fov;
    return this;
  }
}
