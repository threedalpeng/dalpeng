import { describe, test } from "vitest";
import { Mat4, Quaternion, Vec3 } from "../src";
import {
  axisAngleDeepTest,
  mat4DeepTest,
  quaternionDeepTest,
  vec3DeepTest,
} from "./utils";

const _1_0_0_90 = new Quaternion([0.7071068, 0, 0, 0.7071068]);

describe("quaternion", () => {
  test.todo("add", () => {});
  test.todo("sub", () => {});
  test.todo("muli", () => {});
  test.todo("divi", () => {});
  test.todo("mulv", () => {
    vec3DeepTest(
      new Quaternion([0, 0, 0, 1]).mulv([0, 0, 1]),
      new Vec3([0, 0, 1])
    );
  });
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
  test("toMat4", () => {
    mat4DeepTest(
      new Quaternion([0, 0, 0, 1]).toMat4(),
      new Mat4([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
    );
    mat4DeepTest(
      new Quaternion([0, 0, 1, 0]).toMat4(),
      new Mat4([-1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
    );
  });
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
