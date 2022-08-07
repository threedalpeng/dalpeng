import { Mat3, Mat4 } from "./Matrix";
import { Vec3 } from "./Vector";

export type AxisAngle = [axis: Vec3, angle: number];

export class Quaternion extends Float32Array {
  get x() {
    return this[0];
  }
  get y() {
    return this[1];
  }
  get z() {
    return this[2];
  }
  get w() {
    return this[3];
  }
  set x(val) {
    this[0] = val;
  }
  set y(val) {
    this[1] = val;
  }
  set z(val) {
    this[2] = val;
  }
  set w(val) {
    this[3] = val;
  }

  muli(i: number) {
    return new Quaternion([this[0] * i, this[1] * i, this[2] * i, this[3] * i]);
  }
  divi(i: number) {
    const inv = 1 / i;
    return new Quaternion([
      this[0] * inv,
      this[1] * inv,
      this[2] * inv,
      this[3] * inv,
    ]);
  }

  mulv(v: Float32List) {
    return new Mat3(this.toMatrix()).mulv(v);
  }
  mul(q: Quaternion) {
    const v = new Vec3([this[0], this[1], this[2]]);
    const qV = new Vec3([q.x, q.y, q.z]);
    const tV = qV.muli(this.w).add(v.muli(q.w)).add(v.cross(qV));
    const tW = this.w * q.w - v.dot(qV);
    return new Quaternion([...tV, tW]).normalize();
  }
  div(q: Quaternion) {
    const v = new Vec3([this[0], this[1], this[2]]);
    const qV = new Vec3([q.x, q.y, q.z]);
    const tV = qV.muli(-this.w).add(v.muli(q.w)).sub(v.cross(qV));
    const tW = this.w * q.w + v.dot(qV);
    return new Quaternion([...tV, tW]).normalize();
  }

  normalize() {
    return this.divi(this.size());
  }

  size() {
    return Math.sqrt(
      this[0] * this[0] +
        this[1] * this[1] +
        this[2] * this[2] +
        this[3] * this[3]
    );
  }
  size2() {
    return (
      this[0] * this[0] +
      this[1] * this[1] +
      this[2] * this[2] +
      this[3] * this[3]
    );
  }

  toAxisAngle(): AxisAngle {
    let axis = Vec3.one();
    let angle = 2 * Math.acos(this.w);
    const s = Math.sqrt(1 - this.w * this.w);
    if (s < 0.00001) {
      axis.x = this.x;
      axis.y = this.y;
      axis.z = this.z;
    } else {
      axis.x = this.x / s;
      axis.y = this.y / s;
      axis.z = this.z / s;
    }
    angle = (angle * 180) / Math.PI;
    return [axis, angle];
  }
  toMatrix() {
    const x2 = this.x * this.x;
    const y2 = this.y * this.y;
    const z2 = this.z * this.z;
    const xy = this.x * this.y;
    const xz = this.x * this.z;
    const yz = this.y * this.z;
    const xw = this.x * this.w;
    const yw = this.y * this.w;
    const zw = this.z * this.w;
    return new Mat4([
      1 - 2 * (y2 + z2),
      2 * (xy + zw),
      2 * (xz - yw),
      0,
      2 * (xy - zw),
      1 - 2 * (x2 + z2),
      2 * (yz + xw),
      0,
      2 * (xz + yw),
      2 * (yz - xw),
      1 - 2 * (x2 + y2),
      0,
      0,
      0,
      0,
      1,
    ]);
  }

  static fromAxisAngle(axis: Vec3, angle: number) {
    axis = axis.normalize();
    angle = (angle * Math.PI) / 180;
    const s = Math.sin(angle * 0.5);
    return new Quaternion([
      axis.x * s,
      axis.y * s,
      axis.z * s,
      Math.cos(angle * 0.5),
    ]);
  }
}
