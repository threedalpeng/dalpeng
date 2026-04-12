import { Mat3, Mat4 } from "./Matrix";
import { Vec3 } from "./Vector";
import { EPSILON } from "./utils";

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

  scale(s: number) {
    return new Quaternion([this[0] * s, this[1] * s, this[2] * s, this[3] * s]);
  }
  divScalar(s: number) {
    const inv = 1 / s;
    return new Quaternion([this[0] * inv, this[1] * inv, this[2] * inv, this[3] * inv]);
  }

  mulv(v: Float32List) {
    const qx = this.x;
    const qy = this.y;
    const qz = this.z;
    const qw = this.w;

    const vx = v[0];
    const vy = v[1];
    const vz = v[2];

    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);

    return new Vec3([
      vx + qw * tx + (qy * tz - qz * ty),
      vy + qw * ty + (qz * tx - qx * tz),
      vz + qw * tz + (qx * ty - qy * tx),
    ]);
  }
  mul(q: Quaternion) {
    const ax = this.x;
    const ay = this.y;
    const az = this.z;
    const aw = this.w;
    const bx = q.x;
    const by = q.y;
    const bz = q.z;
    const bw = q.w;

    return new Quaternion([
      aw * bx + ax * bw + ay * bz - az * by,
      aw * by - ax * bz + ay * bw + az * bx,
      aw * bz + ax * by - ay * bx + az * bw,
      aw * bw - ax * bx - ay * by - az * bz,
    ]);
  }
  div(q: Quaternion) {
    const ax = this.x;
    const ay = this.y;
    const az = this.z;
    const aw = this.w;
    const bx = q.x;
    const by = q.y;
    const bz = q.z;
    const bw = q.w;

    const lenSq = q.sizeSq();
    if (lenSq <= EPSILON * EPSILON) {
      return Quaternion.identity();
    }
    const invLenSq = 1 / lenSq;

    const ix = -bx * invLenSq;
    const iy = -by * invLenSq;
    const iz = -bz * invLenSq;
    const iw = bw * invLenSq;

    return new Quaternion([
      aw * ix + ax * iw + ay * iz - az * iy,
      aw * iy - ax * iz + ay * iw + az * ix,
      aw * iz + ax * iy - ay * ix + az * iw,
      aw * iw - ax * ix - ay * iy - az * iz,
    ]).normalize();
  }

  normalize(epsilon = EPSILON) {
    const lenSq = this.sizeSq();
    if (lenSq <= epsilon * epsilon) {
      return Quaternion.identity();
    }
    const inv = 1 / Math.sqrt(lenSq);
    return new Quaternion([this[0] * inv, this[1] * inv, this[2] * inv, this[3] * inv]);
  }

  size() {
    return Math.sqrt(this.sizeSq());
  }
  sizeSq() {
    return this[0] * this[0] + this[1] * this[1] + this[2] * this[2] + this[3] * this[3];
  }

  toAxisAngle(): AxisAngle {
    const angle = 2 * Math.acos(this.w);
    const s = Math.sqrt(1 - this.w * this.w);
    const axis =
      s < 1e-5
        ? new Vec3([this.x, this.y, this.z])
        : new Vec3([this.x / s, this.y / s, this.z / s]);
    return [axis, angle];
  }
  toMat3() {
    const x2 = this.x * this.x;
    const y2 = this.y * this.y;
    const z2 = this.z * this.z;
    const xy = this.x * this.y;
    const xz = this.x * this.z;
    const yz = this.y * this.z;
    const xw = this.x * this.w;
    const yw = this.y * this.w;
    const zw = this.z * this.w;
    // prettier-ignore
    return new Mat3([
      1 - 2 * (y2 + z2),  2 * (xy + zw),      2 * (xz - yw),
      2 * (xy - zw),      1 - 2 * (x2 + z2),  2 * (yz + xw),
      2 * (xz + yw),      2 * (yz - xw),      1 - 2 * (x2 + y2),
    ]);
  }
  toMat4() {
    const x2 = this.x * this.x;
    const y2 = this.y * this.y;
    const z2 = this.z * this.z;
    const xy = this.x * this.y;
    const xz = this.x * this.z;
    const yz = this.y * this.z;
    const xw = this.x * this.w;
    const yw = this.y * this.w;
    const zw = this.z * this.w;
    // prettier-ignore
    return new Mat4([
      1 - 2 * (y2 + z2),  2 * (xy + zw),      2 * (xz - yw),      0,
      2 * (xy - zw),      1 - 2 * (x2 + z2),  2 * (yz + xw),      0,
      2 * (xz + yw),      2 * (yz - xw),      1 - 2 * (x2 + y2),  0,
      0,                  0,                  0,                  1,
    ]);
  }

  static fromAxisAngle(axis: Vec3, angle: number) {
    axis = axis.normalize();
    const s = Math.sin(angle * 0.5);
    return new Quaternion([axis.x * s, axis.y * s, axis.z * s, Math.cos(angle * 0.5)]);
  }
  static fromAxisAngleDeg(axis: Vec3, angleDeg: number) {
    return Quaternion.fromAxisAngle(axis, (angleDeg * Math.PI) / 180);
  }

  static identity() {
    return new Quaternion([0, 0, 0, 1]);
  }

  static lerp(a: Quaternion, b: Quaternion, t: number) {
    return new Quaternion([
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t,
      a.w + (b.w - a.w) * t,
    ]).normalize();
  }

  static slerp(a: Quaternion, b: Quaternion, t: number) {
    let bx = b.x;
    let by = b.y;
    let bz = b.z;
    let bw = b.w;
    let cosHalfTheta = a.x * bx + a.y * by + a.z * bz + a.w * bw;

    if (cosHalfTheta < 0) {
      cosHalfTheta = -cosHalfTheta;
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
    }

    if (cosHalfTheta > 1 - EPSILON) {
      return Quaternion.lerp(a, new Quaternion([bx, by, bz, bw]), t);
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sin(halfTheta);
    if (Math.abs(sinHalfTheta) <= EPSILON) {
      return Quaternion.lerp(a, new Quaternion([bx, by, bz, bw]), t);
    }

    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    return new Quaternion([
      a.x * ratioA + bx * ratioB,
      a.y * ratioA + by * ratioB,
      a.z * ratioA + bz * ratioB,
      a.w * ratioA + bw * ratioB,
    ]);
  }

  static fromLookRotation(forward: Vec3, up: Vec3) {
    const f = new Vec3(forward).normalize();
    const baseF = Vec3.forward(); // [0, 0, -1] — engine forward direction
    let qDir: Quaternion;
    let dot = baseF.dot(f);
    dot = Math.max(-1, Math.min(1, dot));
    if (dot > 1 - 1e-6) {
      qDir = Quaternion.identity();
    } else if (dot < -1 + 1e-6) {
      let axis = up.cross(baseF);
      if (axis.sizeSq() <= 1e-6) axis = Vec3.right();
      qDir = Quaternion.fromAxisAngle(axis.normalize(), Math.PI);
    } else {
      const axis = baseF.cross(f).normalize();
      const angle = Math.acos(dot);
      qDir = Quaternion.fromAxisAngle(axis, angle);
    }

    const desiredUp = new Vec3(up).normalize();
    const curUp = qDir.mulv(Vec3.up()).normalize();
    const axisF = f;
    const c = curUp.cross(desiredUp);
    const s = Math.max(-1, Math.min(1, curUp.dot(desiredUp)));
    const roll = Math.atan2(c.dot(axisF), s);
    const qRoll = Quaternion.fromAxisAngle(axisF, roll);
    return qRoll.mul(qDir);
  }
}
