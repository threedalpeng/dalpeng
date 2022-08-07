import { Mat4, Quaternion, Vec3 } from "@dalpeng/math";
import Component from "./component/Component";

export default class Transform extends Component {
  position: Vec3 = new Vec3([0, 0, 0]);
  rotation: Quaternion = new Quaternion([0, 0, 0, 1]);
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
