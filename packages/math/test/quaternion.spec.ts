import { describe, expect, test } from "vitest";
import { Vec3 } from "../src";
import { Quaternion } from "../src/Quaternion";

const _1_0_0_90 = new Quaternion([0.7071068, 0, 0, 0.7071068]);

describe("quaternion", () => {
  test("add", () => {});
  test("sub", () => {});
  test("muli", () => {});
  test("divi", () => {});
  test("mulv", () => {});
  test("mul", () => {});
  test("div", () => {});
  test("normalize", () => {});
  test("size", () => {});
  test("size2", () => {});
  test("toAxisAngle", () => {
    expect(_1_0_0_90.toAxisAngle).to;
  });
  test("toMatrix", () => {});
  test("fromAxisAngle", () => {
    const deepTest = (q: Quaternion, t: Quaternion) => {
      expect(q.x).toBeCloseTo(t.x);
      expect(q.y).toBeCloseTo(t.y);
      expect(q.z).toBeCloseTo(t.z);
      expect(q.w).toBeCloseTo(t.w);
    };
    const q1 = Quaternion.fromAxisAngle(new Vec3([1, 0, 0]), 90);
    deepTest(q1, _1_0_0_90);

    const q2 = Quaternion.fromAxisAngle(new Vec3([50, 90, 0]), 251);
    deepTest(q2, new Quaternion([0.3953694, 0.711665, 0, -0.580703]));

    const q3 = Quaternion.fromAxisAngle(new Vec3([29, -86, 162]), -691);
    deepTest(q3, new Quaternion([0.0391028, -0.11596, 0.2184363, 0.9681476]));
  });
});
