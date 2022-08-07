import { describe, expect, test } from "vitest";
import { Mat4, Vec2, Vec3, Vec4 } from "../src";
import { vec4DeepTest } from "./utils";

describe("Matrix", () => {
  describe("Mat4", () => {
    test("view", () => {
      const eye = new Vec3([0, 0, -5]);
      const at = new Vec3([0, 0, 0]);
      const up = new Vec3([0, 1, 0]);
      const viewMatrix = Mat4.view(eye, at, up);

      vec4DeepTest(
        viewMatrix.mulv(new Vec4([...at, 1])),
        new Vec4([0, 0, -5, 1])
      );
    });
  });
});
