import { describe, expect, test } from "vitest";
import { Mat3, Mat4, Quaternion, Vec3, Vec4 } from "../src";
import { vec3DeepTest, vec4DeepTest } from "./utils";

describe("Matrix", () => {
  describe("Mat3", () => {
    test("mulv", () => {
      const m = new Mat3([1, 0, 0, 0, 1, 0, 0, 0, 1]);
      vec3DeepTest(m.mulv([0, 0, 1]), new Vec3([0, 0, 1]));
    });
    test("inverse returns identity for non-singular matrices", () => {
      const m = Mat3.identity();
      const inverse = m.inverse();
      expect(inverse).not.toBeNull();
      expect([...inverse!]).toEqual([...m]);
    });
    test("inverse returns null for singular matrices", () => {
      const singular = new Mat3([1, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(singular.inverse()).toBeNull();
    });
  });
  describe("Mat4", () => {
    test("view", () => {
      const eye = new Vec3([0, 0, -5]);
      const at = new Vec3([0, 0, 0]);
      const up = new Vec3([0, 1, 0]);
      const viewMatrix = Mat4.view(eye, at, up);

      vec4DeepTest(viewMatrix.mulv(new Vec4([...at, 1])), new Vec4([0, 0, -5, 1]));
    });
    test("inverse returns identity for non-singular matrices", () => {
      const m = Mat4.identity();
      const inv = m.inverse();
      expect(inv).not.toBeNull();
      expect([...inv!]).toEqual([...m]);
    });
    test("inverse returns null for singular matrices", () => {
      const singular = new Mat4([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(singular.inverse()).toBeNull();
    });
    test("view identity when looking -Z from origin", () => {
      const eye = new Vec3([0, 0, 0]);
      const at = new Vec3([0, 0, -1]);
      const up = new Vec3([0, 1, 0]);
      const view = Mat4.view(eye, at, up);
      const id = Mat4.identity();
      for (let i = 0; i < 16; i++) expect(view[i]).toBeCloseTo(id[i]);
    });
    test("compose reproduces translation and normalMatrix3 matches rotation", () => {
      const t = new Vec3([1, 2, 3]);
      const q = Quaternion.fromAxisAngle(new Vec3([0, 1, 0]), Math.PI / 2);
      const s = new Vec3([1, 1, 1]);
      const m = Mat4.compose(t, q, s);
      const tr = m.translation();
      expect(tr.x).toBeCloseTo(1);
      expect(tr.y).toBeCloseTo(2);
      expect(tr.z).toBeCloseTo(3);

      const n = m.normalMatrix3();
      const v = n.mulv(new Vec3([1, 0, 0]));
      expect(v.x).toBeCloseTo(0);
      expect(v.y).toBeCloseTo(0);
      expect(v.z).toBeCloseTo(-1);
    });

    test("col extracts columns in row-major storage", () => {
      const m = new Mat4([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      vec4DeepTest(m.col(0), new Vec4([1, 5, 9, 13]));
      vec4DeepTest(m.col(1), new Vec4([2, 6, 10, 14]));
      vec4DeepTest(m.col(2), new Vec4([3, 7, 11, 15]));
      vec4DeepTest(m.col(3), new Vec4([4, 8, 12, 16]));
    });
  });
});
