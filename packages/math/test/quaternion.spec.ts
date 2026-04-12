import { describe, expect, test } from "vitest";
import { Mat4, Quaternion, Vec3 } from "../src";
import { axisAngleDeepTest, mat4DeepTest, quaternionDeepTest, vec3DeepTest } from "./utils";

const _1_0_0_90 = new Quaternion([0.7071068, 0, 0, 0.7071068]);

describe("quaternion", () => {
  test("scale", () => {
    quaternionDeepTest(new Quaternion([1, 2, 3, 4]).scale(2), new Quaternion([2, 4, 6, 8]));
  });
  test("divScalar", () => {
    quaternionDeepTest(new Quaternion([2, 4, 6, 8]).divScalar(2), new Quaternion([1, 2, 3, 4]));
  });
  test("mulv rotates vectors without extra allocation", () => {
    const q = Quaternion.fromAxisAngle(new Vec3([0, 1, 0]), Math.PI / 2);
    vec3DeepTest(q.mulv([0, 0, 1]), new Vec3([1, 0, 0]));
  });
  test("mul composes rotations", () => {
    const qx = Quaternion.fromAxisAngle(new Vec3([1, 0, 0]), Math.PI / 2);
    const qy = Quaternion.fromAxisAngle(new Vec3([0, 1, 0]), Math.PI / 2);
    quaternionDeepTest(qy.mul(qx), new Quaternion([0.5, 0.5, -0.5, 0.5]));
  });
  test("div handles zero divisors gracefully", () => {
    quaternionDeepTest(
      new Quaternion([1, 0, 0, 0]).div(new Quaternion([0, 0, 0, 0])),
      Quaternion.identity()
    );
  });
  test("normalize returns identity for zero-length quaternions", () => {
    quaternionDeepTest(new Quaternion([0, 0, 0, 0]).normalize(), Quaternion.identity());
  });
  test("size helpers stay consistent", () => {
    const q = new Quaternion([2, 0, 0, 0]);
    expect(q.sizeSq()).toBe(4);
    expect(q.size()).toBe(2);
  });
  test("lerp interpolates rotations linearly", () => {
    const qa = Quaternion.identity();
    const qb = Quaternion.fromAxisAngle(new Vec3([0, 0, 1]), Math.PI / 2);
    axisAngleDeepTest(Quaternion.lerp(qa, qb, 0.5).toAxisAngle(), [
      new Vec3([0, 0, 1]),
      Math.PI / 4,
    ]);
  });
  test("slerp interpolates along shortest arc", () => {
    const qa = Quaternion.identity();
    const qb = Quaternion.fromAxisAngle(new Vec3([0, 0, 1]), Math.PI / 2);
    axisAngleDeepTest(Quaternion.slerp(qa, qb, 0.5).toAxisAngle(), [
      new Vec3([0, 0, 1]),
      Math.PI / 4,
    ]);
  });
  test("toAxisAngle", () => {
    axisAngleDeepTest(_1_0_0_90.toAxisAngle(), [new Vec3([1, 0, 0]), Math.PI / 2]);
    axisAngleDeepTest(new Quaternion([0.3953694, 0.711665, 0, -0.580703]).toAxisAngle(), [
      new Vec3([50, 90, 0]),
      (251 * Math.PI) / 180,
    ]);
    axisAngleDeepTest(new Quaternion([0.0391028, -0.11596, 0.2184363, 0.9681476]).toAxisAngle(), [
      new Vec3([29, -86, 162]),
      (-691 * Math.PI) / 180,
    ]);
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
    const q1 = Quaternion.fromAxisAngle(new Vec3([1, 0, 0]), Math.PI / 2);
    quaternionDeepTest(q1, _1_0_0_90);

    const q2 = Quaternion.fromAxisAngle(new Vec3([50, 90, 0]), (251 * Math.PI) / 180);
    quaternionDeepTest(q2, new Quaternion([0.3953694, 0.711665, 0, -0.580703]));

    const q3 = Quaternion.fromAxisAngle(new Vec3([29, -86, 162]), (-691 * Math.PI) / 180);
    quaternionDeepTest(q3, new Quaternion([0.0391028, -0.11596, 0.2184363, 0.9681476]));
  });
  test("fromLookRotation aims forward and aligns up", () => {
    const f = new Vec3([0, -1, -1]).normalize();
    const up = new Vec3([0, 1, 0]);
    const q = Quaternion.fromLookRotation(f, up);
    const f3 = q.mulv([0, 0, -1]).normalize();
    vec3DeepTest(f3, f);
    const u3 = q.mulv([0, 1, 0]).normalize();
    expect(u3.dot(up) > 0).toBe(true);
  });
});
