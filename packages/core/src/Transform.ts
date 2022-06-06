import { Mat3, Quaternion, Vec2, Vec3 } from "@dalpeng/math";
import Component from "./component/Component";

export class Transform2D extends Component {
  position: Vec2 = new Vec2([0, 0]);
  rotation: number = 0;
  scale: Vec2 = new Vec2([1, 1]);

  translate(v: Float32List) {
    this.position = this.position.add(v);
  }
  rotate(angle: number) {
    this.rotation += angle;
  }

  getModelMatrix() {
    return Mat3.translate(this.position)
      .mul(Mat3.rotate(this.rotation))
      .mul(Mat3.scale(this.scale));
  }
}

/*
export class Transform3D extends Component {
  position: Vec3 = new Vec3([0, 0, 0]);
  rotation: Quaternion = new Quaternion();
  scale: Vec3 = new Vec3([0, 0, 0]);

  translate(v: Float32List) {
    this.position = this.position.add(v);
  }

  rotate(axis: Vec3, angle: number) {
    this.rotation = this.rotation.mul(Quaternion.fromAxisAngle(axis, angle));
  }

  getModelMatrix() {
    return Mat4.translate(this.position)
      .mul(Mat4.rotate(this.rotation))
      .mul(Mat4.scale(this.scale));
  }
}
*/
