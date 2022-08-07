import { expect } from "vitest";
import type { Vec2, Vec3, Vec4 } from "../src";

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
