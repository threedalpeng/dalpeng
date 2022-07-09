import { describe, expect, test } from "vitest";
import { Vec3, type AxisAngle, Quaternion } from "../src";

const _1_0_0_90 = new Quaternion([0.7071068, 0, 0, 0.7071068]);

const axisAngleDeepTest = (
  [axis, angle]: AxisAngle,
  [tAxis, tAngle]: AxisAngle
) => {
  function isInappropriateRatio(ratio) {
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

const quaternionDeepTest = (q: Quaternion, t: Quaternion) => {
  expect(q.x).toBeCloseTo(t.x);
  expect(q.y).toBeCloseTo(t.y);
  expect(q.z).toBeCloseTo(t.z);
  expect(q.w).toBeCloseTo(t.w);
};

describe("quaternion", () => {
  test.todo("add", () => {});
  test.todo("sub", () => {});
  test.todo("muli", () => {});
  test.todo("divi", () => {});
  test.todo("mulv", () => {});
  test.todo("mul", () => {});
  test.todo("div", () => {});
  test.todo("normalize", () => {});
  test.todo("size", () => {});
  test.todo("size2", () => {});
  test("toAxisAngle", () => {
    axisAngleDeepTest(_1_0_0_90.toAxisAngle(), [new Vec3([1, 0, 0]), 90]);
    axisAngleDeepTest(
      new Quaternion([0.3953694, 0.711665, 0, -0.580703]).toAxisAngle(),
      [new Vec3([50, 90, 0]), 251]
    );
    axisAngleDeepTest(
      new Quaternion([0.0391028, -0.11596, 0.2184363, 0.9681476]).toAxisAngle(),
      [new Vec3([29, -86, 162]), -691]
    );
  });
  test("toMatrix", () => {});
  test("fromAxisAngle", () => {
    const q1 = Quaternion.fromAxisAngle(new Vec3([1, 0, 0]), 90);
    quaternionDeepTest(q1, _1_0_0_90);

    const q2 = Quaternion.fromAxisAngle(new Vec3([50, 90, 0]), 251);
    quaternionDeepTest(q2, new Quaternion([0.3953694, 0.711665, 0, -0.580703]));

    const q3 = Quaternion.fromAxisAngle(new Vec3([29, -86, 162]), -691);
    quaternionDeepTest(
      q3,
      new Quaternion([0.0391028, -0.11596, 0.2184363, 0.9681476])
    );
  });
});
