import { expect } from "vitest";
import type { Mat4, Vec2, Vec3, Vec4, Quaternion, AxisAngle } from "../src";

export function vec2DeepTest(v: Vec2, t: Vec2) {
  expect(v.x).toBeCloseTo(t.x);
  expect(v.y).toBeCloseTo(t.y);
}

export function vec3DeepTest(v: Vec3, t: Vec3) {
  expect(v.x).toBeCloseTo(t.x);
  expect(v.y).toBeCloseTo(t.y);
  expect(v.z).toBeCloseTo(t.z);
}

export function vec4DeepTest(v: Vec4, t: Vec4) {
  expect(v.x).toBeCloseTo(t.x);
  expect(v.y).toBeCloseTo(t.y);
  expect(v.z).toBeCloseTo(t.z);
  expect(v.w).toBeCloseTo(t.w);
}

export const mat4DeepTest = (m: Mat4, t: Mat4) => {
  const tarr = [...t];
  [...m].forEach((value, idx) => {
    expect(value).toBeCloseTo(tarr[idx]);
  });
};

export const axisAngleDeepTest = (
  [axis, angle]: AxisAngle,
  [tAxis, tAngle]: AxisAngle
) => {
  function isInappropriateRatio(ratio: number) {
    return (
      isNaN(ratio) || !isFinite(ratio) || ratio === undefined || ratio === null
    );
  }
  const ratio = isInappropriateRatio(axis.x / tAxis.x)
    ? isInappropriateRatio(axis.y / tAxis.y)
      ? isInappropriateRatio(axis.z / tAxis.z)
        ? 0
        : axis.z / tAxis.z
      : axis.y / tAxis.y
    : axis.x / tAxis.x;
  expect(axis.x).toBeCloseTo(tAxis.x * ratio);
  expect(axis.y).toBeCloseTo(tAxis.y * ratio);
  expect(axis.z).toBeCloseTo(tAxis.z * ratio);
  expect(((angle % 360) + 360) % 360).toBeCloseTo(((tAngle % 360) + 360) % 360);
};

export const quaternionDeepTest = (q: Quaternion, t: Quaternion) => {
  expect(q.x).toBeCloseTo(t.x);
  expect(q.y).toBeCloseTo(t.y);
  expect(q.z).toBeCloseTo(t.z);
  expect(q.w).toBeCloseTo(t.w);
};
