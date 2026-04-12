import { EPSILON } from "./utils";

export class Vec2 extends Float32Array {
  constructor(values: ArrayLike<number>) {
    super(values);
    if (this.length !== 2)
      throw new RangeError(`Vec2 requires exactly 2 elements, got ${this.length}`);
  }

  get x() {
    return this[0];
  }
  get y() {
    return this[1];
  }
  get r() {
    return this[0];
  }
  get g() {
    return this[1];
  }
  get s() {
    return this[0];
  }
  get t() {
    return this[1];
  }
  set x(val) {
    this[0] = val;
  }
  set y(val) {
    this[1] = val;
  }
  set r(val) {
    this[0] = val;
  }
  set g(val) {
    this[1] = val;
  }
  set s(val) {
    this[0] = val;
  }
  set t(val) {
    this[1] = val;
  }

  add(v: Float32List) {
    return new Vec2([this[0] + v[0], this[1] + v[1]]);
  }
  sub(v: Float32List) {
    return new Vec2([this[0] - v[0], this[1] - v[1]]);
  }
  scale(s: number) {
    return new Vec2([this[0] * s, this[1] * s]);
  }
  dot(v: Float32List) {
    return this[0] * v[0] + this[1] * v[1];
  }
  mul(v: Float32List) {
    return new Vec2([this[0] * v[0], this[1] * v[1]]);
  }
  div(v: Float32List) {
    return new Vec2([this[0] / v[0], this[1] / v[1]]);
  }
  negate() {
    return new Vec2([-this[0], -this[1]]);
  }
  min(v: Float32List) {
    return new Vec2([Math.min(this[0], v[0]), Math.min(this[1], v[1])]);
  }
  max(v: Float32List) {
    return new Vec2([Math.max(this[0], v[0]), Math.max(this[1], v[1])]);
  }
  clamp(lo: Float32List, hi: Float32List) {
    return this.max(lo).min(hi);
  }

  size() {
    return Math.sqrt(this[0] * this[0] + this[1] * this[1]);
  }
  sizeSq() {
    return this[0] * this[0] + this[1] * this[1];
  }

  normalize(epsilon = EPSILON) {
    const lenSq = this.sizeSq();
    if (lenSq <= epsilon * epsilon) {
      return Vec2.zero();
    }
    const inv = 1 / Math.sqrt(lenSq);
    return new Vec2([this[0] * inv, this[1] * inv]);
  }

  static zero() {
    return new Vec2([0, 0]);
  }
  static one() {
    return new Vec2([1, 1]);
  }
  static up() {
    return new Vec2([0, 1]);
  }
  static down() {
    return new Vec2([0, -1]);
  }
  static left() {
    return new Vec2([-1, 0]);
  }
  static right() {
    return new Vec2([1, 0]);
  }
  static lerp(a: Float32List, b: Float32List, t: number) {
    return new Vec2([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
}

export function vec2(): Vec2;
export function vec2(x: number): Vec2;
export function vec2(v: Float32List): Vec2;
export function vec2(x: number, y: number): Vec2;
export function vec2(x?: number | Float32List, y?: number): Vec2 {
  switch (typeof x) {
    case "number":
      return new Vec2([x, y ?? x]);
    case "object":
      return new Vec2(x);
    default:
      return new Vec2([0, 0]);
  }
}

export class Vec3 extends Float32Array {
  constructor(values: ArrayLike<number>) {
    super(values);
    if (this.length !== 3)
      throw new RangeError(`Vec3 requires exactly 3 elements, got ${this.length}`);
  }

  get x() {
    return this[0];
  }
  get y() {
    return this[1];
  }
  get z() {
    return this[2];
  }
  get r() {
    return this[0];
  }
  get g() {
    return this[1];
  }
  get b() {
    return this[2];
  }
  get s() {
    return this[0];
  }
  get t() {
    return this[1];
  }
  get p() {
    return this[2];
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
  set r(val) {
    this[0] = val;
  }
  set g(val) {
    this[1] = val;
  }
  set b(val) {
    this[2] = val;
  }
  set s(val) {
    this[0] = val;
  }
  set t(val) {
    this[1] = val;
  }
  set p(val) {
    this[2] = val;
  }

  add(v: Float32List) {
    return new Vec3([this[0] + v[0], this[1] + v[1], this[2] + v[2]]);
  }
  sub(v: Float32List) {
    return new Vec3([this[0] - v[0], this[1] - v[1], this[2] - v[2]]);
  }
  scale(s: number) {
    return new Vec3([this[0] * s, this[1] * s, this[2] * s]);
  }
  dot(v: Float32List) {
    return this[0] * v[0] + this[1] * v[1] + this[2] * v[2];
  }
  cross(v: Float32List) {
    return new Vec3([
      this[1] * v[2] - this[2] * v[1],
      this[2] * v[0] - this[0] * v[2],
      this[0] * v[1] - this[1] * v[0],
    ]);
  }
  mul(v: Float32List) {
    return new Vec3([this[0] * v[0], this[1] * v[1], this[2] * v[2]]);
  }
  div(v: Float32List) {
    return new Vec3([this[0] / v[0], this[1] / v[1], this[2] / v[2]]);
  }
  negate() {
    return new Vec3([-this[0], -this[1], -this[2]]);
  }
  min(v: Float32List) {
    return new Vec3([Math.min(this[0], v[0]), Math.min(this[1], v[1]), Math.min(this[2], v[2])]);
  }
  max(v: Float32List) {
    return new Vec3([Math.max(this[0], v[0]), Math.max(this[1], v[1]), Math.max(this[2], v[2])]);
  }
  clamp(lo: Float32List, hi: Float32List) {
    return this.max(lo).min(hi);
  }

  size() {
    return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
  }
  sizeSq() {
    return this[0] * this[0] + this[1] * this[1] + this[2] * this[2];
  }

  normalize(epsilon = EPSILON) {
    const lenSq = this.sizeSq();
    if (lenSq <= epsilon * epsilon) {
      return Vec3.zero();
    }
    const inv = 1 / Math.sqrt(lenSq);
    return new Vec3([this[0] * inv, this[1] * inv, this[2] * inv]);
  }

  static zero() {
    return new Vec3([0, 0, 0]);
  }
  static one() {
    return new Vec3([1, 1, 1]);
  }
  static up() {
    return new Vec3([0, 1, 0]);
  }
  static down() {
    return new Vec3([0, -1, 0]);
  }
  static left() {
    return new Vec3([-1, 0, 0]);
  }
  static right() {
    return new Vec3([1, 0, 0]);
  }
  static forward() {
    return new Vec3([0, 0, -1]);
  }
  static back() {
    return new Vec3([0, 0, 1]);
  }
  static lerp(a: Float32List, b: Float32List, t: number) {
    return new Vec3([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
  }
}
export function vec3(): Vec3;
export function vec3(x: number): Vec3;
export function vec3(v: Float32List): Vec3;
export function vec3(x: number, y: number, z: number): Vec3;
export function vec3(x?: number | Float32List, y?: number, z?: number): Vec3 {
  switch (typeof x) {
    case "number":
      return new Vec3([x, y ?? x, z ?? x]);
    case "object":
      return new Vec3(x);
    default:
      return new Vec3([0, 0, 0]);
  }
}

export class Vec4 extends Float32Array {
  constructor(values: ArrayLike<number>) {
    super(values);
    if (this.length !== 4)
      throw new RangeError(`Vec4 requires exactly 4 elements, got ${this.length}`);
  }

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
  get r() {
    return this[0];
  }
  get g() {
    return this[1];
  }
  get b() {
    return this[2];
  }
  get a() {
    return this[3];
  }
  get s() {
    return this[0];
  }
  get t() {
    return this[1];
  }
  get p() {
    return this[2];
  }
  get q() {
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
  set r(val) {
    this[0] = val;
  }
  set g(val) {
    this[1] = val;
  }
  set b(val) {
    this[2] = val;
  }
  set a(val) {
    this[3] = val;
  }
  set s(val) {
    this[0] = val;
  }
  set t(val) {
    this[1] = val;
  }
  set p(val) {
    this[2] = val;
  }
  set q(val) {
    this[3] = val;
  }

  add(v: Float32List) {
    return new Vec4([this[0] + v[0], this[1] + v[1], this[2] + v[2], this[3] + v[3]]);
  }
  sub(v: Float32List) {
    return new Vec4([this[0] - v[0], this[1] - v[1], this[2] - v[2], this[3] - v[3]]);
  }
  scale(s: number) {
    return new Vec4([this[0] * s, this[1] * s, this[2] * s, this[3] * s]);
  }
  dot(v: Float32List) {
    return this[0] * v[0] + this[1] * v[1] + this[2] * v[2] + this[3] * v[3];
  }
  mul(v: Float32List) {
    return new Vec4([this[0] * v[0], this[1] * v[1], this[2] * v[2], this[3] * v[3]]);
  }
  div(v: Float32List) {
    return new Vec4([this[0] / v[0], this[1] / v[1], this[2] / v[2], this[3] / v[3]]);
  }
  negate() {
    return new Vec4([-this[0], -this[1], -this[2], -this[3]]);
  }
  min(v: Float32List) {
    return new Vec4([
      Math.min(this[0], v[0]),
      Math.min(this[1], v[1]),
      Math.min(this[2], v[2]),
      Math.min(this[3], v[3]),
    ]);
  }
  max(v: Float32List) {
    return new Vec4([
      Math.max(this[0], v[0]),
      Math.max(this[1], v[1]),
      Math.max(this[2], v[2]),
      Math.max(this[3], v[3]),
    ]);
  }
  clamp(lo: Float32List, hi: Float32List) {
    return this.max(lo).min(hi);
  }

  size() {
    return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2] + this[3] * this[3]);
  }
  sizeSq() {
    return this[0] * this[0] + this[1] * this[1] + this[2] * this[2] + this[3] * this[3];
  }

  normalize(epsilon = EPSILON) {
    const lenSq = this.sizeSq();
    if (lenSq <= epsilon * epsilon) {
      return Vec4.zero();
    }
    const inv = 1 / Math.sqrt(lenSq);
    return new Vec4([this[0] * inv, this[1] * inv, this[2] * inv, this[3] * inv]);
  }

  static zero() {
    return new Vec4([0, 0, 0, 0]);
  }
  static one() {
    return new Vec4([1, 1, 1, 1]);
  }
  static lerp(a: Float32List, b: Float32List, t: number) {
    return new Vec4([
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
      a[3] + (b[3] - a[3]) * t,
    ]);
  }
}

export function vec4(): Vec4;
export function vec4(x: number): Vec4;
export function vec4(v: Float32List): Vec4;
export function vec4(x: number, y: number, z: number, w: number): Vec4;
export function vec4(x?: number | Float32List, y?: number, z?: number, w?: number): Vec4 {
  switch (typeof x) {
    case "number":
      return new Vec4([x, y ?? x, z ?? x, w ?? x]);
    case "object":
      return new Vec4(x);
    default:
      return new Vec4([0, 0, 0, 0]);
  }
}
