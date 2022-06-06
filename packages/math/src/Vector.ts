export class Vec2 extends Float32Array {
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
  muli(i: number) {
    return new Vec2([this[0] * i, this[1] * i]);
  }
  dot(v: Float32List) {
    return this[0] * v[0] + this[1] * v[1];
  }

  size() {
    return Math.sqrt(this[0] * this[0] + this[1] * this[1]);
  }
  size2() {
    return this[0] * this[0] + this[1] * this[1];
  }

  normalize() {
    const size = this.size();
    return new Vec2([this[0] / size, this[1] / size]);
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
  muli(i: number) {
    return new Vec3([this[0] * i, this[1] * i, this[2] * i]);
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

  size() {
    return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
  }
  size2() {
    return this[0] * this[0] + this[1] * this[1] + this[2] * this[2];
  }

  normalize() {
    const size = this.size();
    return new Vec3([this[0] / size, this[1] / size, this[2] / size]);
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
    return new Vec4([
      this[0] + v[0],
      this[1] + v[1],
      this[2] + v[2],
      this[3] + v[3],
    ]);
  }
  sub(v: Float32List) {
    return new Vec4([
      this[0] - v[0],
      this[1] - v[1],
      this[2] - v[2],
      this[3] - v[3],
    ]);
  }
  muli(i: number) {
    return new Vec4([this[0] * i, this[1] * i, this[2] * i, this[3] * i]);
  }
  dot(v: Float32List) {
    return this[0] * v[0] + this[1] * v[1] + this[2] * v[2] + this[3] * v[3];
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

  normalize() {
    const size = this.size();
    return new Vec4([
      this[0] / size,
      this[1] / size,
      this[2] / size,
      this[3] / size,
    ]);
  }
}

export function vec4(): Vec4;
export function vec4(x: number): Vec4;
export function vec4(v: Float32List): Vec4;
export function vec4(x: number, y: number, z: number, w: number): Vec4;
export function vec4(
  x?: number | Float32List,
  y?: number,
  z?: number,
  w?: number
): Vec4 {
  switch (typeof x) {
    case "number":
      return new Vec4([x, y ?? x, z ?? x, w ?? x]);
    case "object":
      return new Vec4(x);
    default:
      return new Vec4([0, 0, 0, 0]);
  }
}
