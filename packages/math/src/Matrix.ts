import { deg2rad } from "./utils";
import { Vec3, Vec4 } from "./Vector";

export class Mat3 extends Float32Array {
  get _00() {
    return this[0];
  }
  get _01() {
    return this[1];
  }
  get _02() {
    return this[2];
  }
  get _10() {
    return this[3];
  }
  get _11() {
    return this[4];
  }
  get _12() {
    return this[5];
  }
  get _20() {
    return this[6];
  }
  get _21() {
    return this[7];
  }
  get _22() {
    return this[8];
  }
  set _00(val) {
    this[0] = val;
  }
  set _01(val) {
    this[1] = val;
  }
  set _02(val) {
    this[2] = val;
  }
  set _10(val) {
    this[3] = val;
  }
  set _11(val) {
    this[4] = val;
  }
  set _12(val) {
    this[5] = val;
  }
  set _20(val) {
    this[6] = val;
  }
  set _21(val) {
    this[7] = val;
  }
  set _22(val) {
    this[8] = val;
  }

  add(m: Float32List) {
    return new Mat3([
      this[0] + m[0],
      this[1] + m[1],
      this[2] + m[2],
      this[3] + m[3],
      this[4] + m[4],
      this[5] + m[5],
      this[6] + m[6],
      this[7] + m[7],
      this[8] + m[8],
    ]);
  }
  sub(m: Float32List) {
    return new Mat3([
      this[0] - m[0],
      this[1] - m[1],
      this[2] - m[2],
      this[3] - m[3],
      this[4] - m[4],
      this[5] - m[5],
      this[6] - m[6],
      this[7] - m[7],
      this[8] - m[8],
    ]);
  }
  muli(i: number) {
    return new Mat3([
      this[0] * i,
      this[1] * i,
      this[2] * i,
      this[3] * i,
      this[4] * i,
      this[5] * i,
      this[6] * i,
      this[7] * i,
      this[8] * i,
    ]);
  }
  mulv(v: Float32List) {
    return new Vec3([
      v[0] * this[0] + v[1] * this[3] + v[2] * this[6],
      v[0] * this[1] + v[1] * this[4] + v[2] * this[7],
      v[0] * this[2] + v[1] * this[5] + v[2] * this[8],
    ]);
  }
  mul(m: Float32List) {
    return new Mat3([
      m[0] * this[0] + m[1] * this[3] + m[2] * this[6],
      m[0] * this[1] + m[1] * this[4] + m[2] * this[7],
      m[0] * this[2] + m[1] * this[5] + m[2] * this[8],
      m[3] * this[0] + m[4] * this[3] + m[5] * this[6],
      m[3] * this[1] + m[4] * this[4] + m[5] * this[7],
      m[3] * this[2] + m[4] * this[5] + m[5] * this[8],
      m[6] * this[0] + m[7] * this[3] + m[8] * this[6],
      m[6] * this[1] + m[7] * this[4] + m[8] * this[7],
      m[6] * this[2] + m[7] * this[5] + m[8] * this[8],
    ]);
  }

  static identity() {
    return new Mat3([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  }

  transpose() {
    return new Mat3([
      this[0],
      this[3],
      this[6],
      this[1],
      this[4],
      this[7],
      this[2],
      this[5],
      this[8],
    ]);
  }

  det() {
    return (
      this[0] * (this[4] * this[8] - this[5] * this[7]) +
      this[1] * (this[5] * this[6] - this[3] * this[8]) +
      this[2] * (this[3] * this[7] - this[4] * this[6])
    );
  }

  inverse() {
    const d = this.det();
    if (d === 0) {
      console.error("inverse() might be singular.");
    }
    const s = 1 / d;
    return new Mat3([
      (this[4] * this[8] - this[7] * this[5]) * s,
      (this[2] * this[7] - this[1] * this[8]) * s,
      (this[1] * this[5] - this[2] * this[4]) * s,
      (this[5] * this[6] - this[3] * this[8]) * s,
      (this[0] * this[8] - this[2] * this[6]) * s,
      (this[3] * this[2] - this[0] * this[5]) * s,
      (this[3] * this[7] - this[6] * this[4]) * s,
      (this[6] * this[1] - this[0] * this[7]) * s,
      (this[0] * this[4] - this[3] * this[1]) * s,
    ]);
  }

  static translate(v: Float32List) {
    return new Mat3([1, 0, 0, 0, 1, 0, v[0], v[1], 1]);
  }
  static rotate(angle: number) {
    const radian = deg2rad(angle);
    const s = Math.sin(radian);
    const c = Math.cos(radian);
    return new Mat3([c, s, 0, -s, c, 0, 0, 0, 1]);
  }
  static scale(v: Float32List) {
    return new Mat3([v[0], 0, 0, 0, v[1], 0, 0, 0, 1]);
  }
}

export class Mat4 extends Float32Array {
  get _00() {
    return this[0];
  }
  get _01() {
    return this[1];
  }
  get _02() {
    return this[2];
  }
  get _03() {
    return this[3];
  }
  get _10() {
    return this[4];
  }
  get _11() {
    return this[5];
  }
  get _12() {
    return this[6];
  }
  get _13() {
    return this[7];
  }
  get _20() {
    return this[8];
  }
  get _21() {
    return this[9];
  }
  get _22() {
    return this[10];
  }
  get _23() {
    return this[11];
  }
  get _30() {
    return this[12];
  }
  get _31() {
    return this[13];
  }
  get _32() {
    return this[14];
  }
  get _33() {
    return this[15];
  }
  set _00(val) {
    this[0] = val;
  }
  set _01(val) {
    this[1] = val;
  }
  set _02(val) {
    this[2] = val;
  }
  set _03(val) {
    this[3] = val;
  }
  set _10(val) {
    this[4] = val;
  }
  set _11(val) {
    this[5] = val;
  }
  set _12(val) {
    this[6] = val;
  }
  set _13(val) {
    this[7] = val;
  }
  set _20(val) {
    this[8] = val;
  }
  set _21(val) {
    this[9] = val;
  }
  set _22(val) {
    this[10] = val;
  }
  set _23(val) {
    this[11] = val;
  }
  set _30(val) {
    this[12] = val;
  }
  set _31(val) {
    this[13] = val;
  }
  set _32(val) {
    this[14] = val;
  }
  set _33(val) {
    this[15] = val;
  }

  row(i: number) {
    return new Vec4(this.subarray(i * 4, i * 4 + 4));
  }

  add(m: Float32List) {
    return new Mat4([
      this[0] + m[0],
      this[1] + m[1],
      this[2] + m[2],
      this[3] + m[3],
      this[4] + m[4],
      this[5] + m[5],
      this[6] + m[6],
      this[7] + m[7],
      this[8] + m[8],
      this[9] + m[9],
      this[10] + m[10],
      this[11] + m[11],
      this[12] + m[12],
      this[13] + m[13],
      this[14] + m[14],
      this[15] + m[15],
    ]);
  }
  sub(m: Float32List) {
    return new Mat4([
      this[0] - m[0],
      this[1] - m[1],
      this[2] - m[2],
      this[3] - m[3],
      this[4] - m[4],
      this[5] - m[5],
      this[6] - m[6],
      this[7] - m[7],
      this[8] - m[8],
      this[9] - m[9],
      this[10] - m[10],
      this[11] - m[11],
      this[12] - m[12],
      this[13] - m[13],
      this[14] - m[14],
      this[15] - m[15],
    ]);
  }
  muli(i: number) {
    return new Mat4([
      this[0] * i,
      this[1] * i,
      this[2] * i,
      this[3] * i,
      this[4] * i,
      this[5] * i,
      this[6] * i,
      this[7] * i,
      this[8] * i,
      this[9] * i,
      this[10] * i,
      this[11] * i,
      this[12] * i,
      this[13] * i,
      this[14] * i,
      this[15] * i,
    ]);
  }
  mulv(v: Float32List) {
    return new Vec4([
      v[0] * this[0] + v[1] * this[4] + v[2] * this[8] + v[3] * this[12],
      v[0] * this[1] + v[1] * this[5] + v[2] * this[9] + v[3] * this[13],
      v[0] * this[2] + v[1] * this[6] + v[2] * this[10] + v[3] * this[14],
      v[0] * this[3] + v[1] * this[7] + v[2] * this[11] + v[3] * this[15],
    ]);
  }
  mul(m: Float32List) {
    return new Mat4([
      m[0] * this[0] + m[1] * this[4] + m[2] * this[8] + m[3] * this[12],
      m[0] * this[1] + m[1] * this[5] + m[2] * this[9] + m[3] * this[13],
      m[0] * this[2] + m[1] * this[6] + m[2] * this[10] + m[3] * this[14],
      m[0] * this[3] + m[1] * this[7] + m[2] * this[11] + m[3] * this[15],
      m[4] * this[0] + m[5] * this[4] + m[6] * this[8] + m[7] * this[12],
      m[4] * this[1] + m[5] * this[5] + m[6] * this[9] + m[7] * this[13],
      m[4] * this[2] + m[5] * this[6] + m[6] * this[10] + m[7] * this[14],
      m[4] * this[3] + m[5] * this[7] + m[6] * this[11] + m[7] * this[15],
      m[8] * this[0] + m[9] * this[4] + m[10] * this[8] + m[11] * this[12],
      m[8] * this[1] + m[9] * this[5] + m[10] * this[9] + m[11] * this[13],
      m[8] * this[2] + m[9] * this[6] + m[10] * this[10] + m[11] * this[14],
      m[8] * this[3] + m[9] * this[7] + m[10] * this[11] + m[11] * this[15],
      m[12] * this[0] + m[13] * this[4] + m[14] * this[8] + m[15] * this[12],
      m[12] * this[1] + m[13] * this[5] + m[14] * this[9] + m[15] * this[13],
      m[12] * this[2] + m[13] * this[6] + m[14] * this[10] + m[15] * this[14],
      m[12] * this[3] + m[13] * this[7] + m[14] * this[11] + m[15] * this[15],
    ]);
  }

  static identity() {
    return new Mat4([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }

  transpose() {
    return new Mat4([
      this[0],
      this[4],
      this[8],
      this[12],
      this[1],
      this[5],
      this[9],
      this[13],
      this[2],
      this[6],
      this[10],
      this[14],
      this[3],
      this[7],
      this[11],
      this[15],
    ]);
  }
  det() {
    return (
      this[12] * this[9] * this[6] * this[3] -
      this[8] * this[13] * this[6] * this[3] -
      this[12] * this[5] * this[10] * this[3] +
      this[4] * this[13] * this[10] * this[3] +
      this[8] * this[5] * this[14] * this[3] -
      this[4] * this[9] * this[14] * this[3] -
      this[12] * this[9] * this[2] * this[7] +
      this[8] * this[13] * this[2] * this[7] +
      this[12] * this[1] * this[10] * this[7] -
      this[0] * this[13] * this[10] * this[7] -
      this[8] * this[1] * this[14] * this[7] +
      this[0] * this[9] * this[14] * this[7] +
      this[12] * this[5] * this[2] * this[11] -
      this[4] * this[13] * this[2] * this[11] -
      this[12] * this[1] * this[6] * this[11] +
      this[0] * this[13] * this[6] * this[11] +
      this[4] * this[1] * this[14] * this[11] -
      this[0] * this[5] * this[14] * this[11] -
      this[8] * this[5] * this[2] * this[15] +
      this[4] * this[9] * this[2] * this[15] +
      this[8] * this[1] * this[6] * this[15] -
      this[0] * this[9] * this[6] * this[15] -
      this[4] * this[1] * this[10] * this[15] +
      this[0] * this[5] * this[10] * this[15]
    );
  }

  inverse() {
    const d = this.det();
    if (d === 0) {
      console.error("inverse() might be singular.");
    }
    const s = 1 / d;
    return new Mat4([
      (this[9] * this[14] * this[7] -
        this[13] * this[10] * this[7] +
        this[13] * this[6] * this[11] -
        this[5] * this[14] * this[11] -
        this[9] * this[6] * this[15] +
        this[5] * this[10] * this[15]) *
        s,
      (this[13] * this[10] * this[3] -
        this[9] * this[14] * this[3] -
        this[13] * this[2] * this[11] +
        this[1] * this[14] * this[11] +
        this[9] * this[2] * this[15] -
        this[1] * this[10] * this[15]) *
        s,
      (this[5] * this[14] * this[3] -
        this[13] * this[6] * this[3] +
        this[13] * this[2] * this[7] -
        this[1] * this[14] * this[7] -
        this[5] * this[2] * this[15] +
        this[1] * this[6] * this[15]) *
        s,
      (this[9] * this[6] * this[3] -
        this[5] * this[10] * this[3] -
        this[9] * this[2] * this[7] +
        this[1] * this[10] * this[7] +
        this[5] * this[2] * this[11] -
        this[1] * this[6] * this[11]) *
        s,
      (this[12] * this[10] * this[7] -
        this[8] * this[14] * this[7] -
        this[12] * this[6] * this[11] +
        this[4] * this[14] * this[11] +
        this[8] * this[6] * this[15] -
        this[4] * this[10] * this[15]) *
        s,
      (this[8] * this[14] * this[3] -
        this[12] * this[10] * this[3] +
        this[12] * this[2] * this[11] -
        this[0] * this[14] * this[11] -
        this[8] * this[2] * this[15] +
        this[0] * this[10] * this[15]) *
        s,
      (this[12] * this[6] * this[3] -
        this[4] * this[14] * this[3] -
        this[12] * this[2] * this[7] +
        this[0] * this[14] * this[7] +
        this[4] * this[2] * this[15] -
        this[0] * this[6] * this[15]) *
        s,
      (this[4] * this[10] * this[3] -
        this[8] * this[6] * this[3] +
        this[8] * this[2] * this[7] -
        this[0] * this[10] * this[7] -
        this[4] * this[2] * this[11] +
        this[0] * this[6] * this[11]) *
        s,
      (this[8] * this[13] * this[7] -
        this[12] * this[9] * this[7] +
        this[12] * this[5] * this[11] -
        this[4] * this[13] * this[11] -
        this[8] * this[5] * this[15] +
        this[4] * this[9] * this[15]) *
        s,
      (this[12] * this[9] * this[3] -
        this[8] * this[13] * this[3] -
        this[12] * this[1] * this[11] +
        this[0] * this[13] * this[11] +
        this[8] * this[1] * this[15] -
        this[0] * this[9] * this[15]) *
        s,
      (this[4] * this[13] * this[3] -
        this[12] * this[5] * this[3] +
        this[12] * this[1] * this[7] -
        this[0] * this[13] * this[7] -
        this[4] * this[1] * this[15] +
        this[0] * this[5] * this[15]) *
        s,
      (this[8] * this[5] * this[3] -
        this[4] * this[9] * this[3] -
        this[8] * this[1] * this[7] +
        this[0] * this[9] * this[7] +
        this[4] * this[1] * this[11] -
        this[0] * this[5] * this[11]) *
        s,
      (this[12] * this[9] * this[6] -
        this[8] * this[13] * this[6] -
        this[12] * this[5] * this[10] +
        this[4] * this[13] * this[10] +
        this[8] * this[5] * this[14] -
        this[4] * this[9] * this[14]) *
        s,
      (this[8] * this[13] * this[2] -
        this[12] * this[9] * this[2] +
        this[12] * this[1] * this[10] -
        this[0] * this[13] * this[10] -
        this[8] * this[1] * this[14] +
        this[0] * this[9] * this[14]) *
        s,
      (this[12] * this[5] * this[2] -
        this[4] * this[13] * this[2] -
        this[12] * this[1] * this[6] +
        this[0] * this[13] * this[6] +
        this[4] * this[1] * this[14] -
        this[0] * this[5] * this[14]) *
        s,
      (this[4] * this[9] * this[2] -
        this[8] * this[5] * this[2] +
        this[8] * this[1] * this[6] -
        this[0] * this[9] * this[6] -
        this[4] * this[1] * this[10] +
        this[0] * this[5] * this[10]) *
        s,
    ]);
  }

  static translate(v: Float32List) {
    return new Mat4([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, v[0], v[1], v[2], 1]);
  }
  static rotate(axis: Float32List, angle: number) {
    const radian = deg2rad(angle);
    const s = Math.sin(radian);
    const c = Math.cos(radian);
    const x = axis[0];
    const y = axis[1];
    const z = axis[2];
    return new Mat4([
      x * x * (1 - c) + c,
      x * y * (1 - c) + z * s,
      x * z * (1 - c) - y * s,
      0,
      x * y * (1 - c) - z * s,
      y * y * (1 - c) + c,
      y * z * (1 - c) + x * s,
      0,
      x * z * (1 - c) + y * s,
      y * z * (1 - c) - x * s,
      z * z * (1 - c) + c,
      0,
      0,
      0,
      0,
      1,
    ]);
  }
  static scale(v: Float32List) {
    return new Mat4([v[0], 0, 0, 0, 0, v[1], 0, 0, 0, 0, 0, v[2], 0, 0, 0, 1]);
  }
}
