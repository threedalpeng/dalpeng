import { describe, expect, test } from "vitest";
import { Vec2, Vec3, Vec4 } from "../src";
import { vec2DeepTest, vec3DeepTest, vec4DeepTest } from "./utils";

describe("Vector", () => {
  describe("Vec2", () => {
    const vec2_i1 = new Vec2([1, 1]);
    const vec2_i2 = new Vec2([3, -4]);
    const vec2_f1 = new Vec2([-1.324, 2.546]);
    const vec2_f2 = new Vec2([4.192, -8.006]);

    test("add", () => {
      vec2DeepTest(vec2_i1.add(vec2_i2), new Vec2([4, -3]));
      vec2DeepTest(vec2_i1.add(vec2_f1), new Vec2([-0.324, 3.546]));
      vec2DeepTest(vec2_f1.add(vec2_f2), new Vec2([2.868, -5.46]));
    });
    test("sub", () => {
      vec2DeepTest(vec2_i1.sub(vec2_i2), new Vec2([-2, 5]));
      vec2DeepTest(vec2_i1.sub(vec2_f1), new Vec2([2.324, -1.546]));
      vec2DeepTest(vec2_f1.sub(vec2_f2), new Vec2([-5.516, 10.552]));
    });
    test("scale", () => {
      vec2DeepTest(vec2_i1.scale(2), new Vec2([2, 2]));
      vec2DeepTest(vec2_i2.scale(5.7), new Vec2([17.1, -22.8]));
      vec2DeepTest(vec2_f1.scale(-7.3), new Vec2([9.6652, -18.5858]));
    });
    test("dot", () => {
      expect(vec2_i1.dot(vec2_i2)).toBeCloseTo(-1);
      expect(vec2_i1.dot(vec2_f1)).toBeCloseTo(1.222);
      expect(vec2_f1.dot(vec2_f2)).toBeCloseTo(-25.933484);
    });
    test("size", () => {
      expect(vec2_i1.size()).toBeCloseTo(Math.sqrt(2));
      expect(vec2_i2.size()).toBeCloseTo(5);
      expect(vec2_f1.size()).toBeCloseTo(Math.sqrt(8.235092));
    });
    test("sizeSq", () => {
      expect(vec2_i1.sizeSq()).toBeCloseTo(2);
      expect(vec2_i2.sizeSq()).toBeCloseTo(25);
      expect(vec2_f1.sizeSq()).toBeCloseTo(8.235092);
    });
    test("normalize", () => {
      vec2DeepTest(vec2_i1.normalize(), new Vec2([0.7071067, 0.7071067]));
      vec2DeepTest(vec2_i2.normalize(), new Vec2([0.6, -0.8]));
      vec2DeepTest(vec2_f1.normalize(), new Vec2([-0.4613746, 0.8872053]));
    });
    test("normalize returns zero for zero-length vectors", () => {
      vec2DeepTest(new Vec2([0, 0]).normalize(), Vec2.zero());
    });
    test("lerp", () => {
      vec2DeepTest(Vec2.lerp(new Vec2([0, 0]), new Vec2([2, 4]), 0.5), new Vec2([1, 2]));
    });
  });

  describe("Vec3", () => {
    const vec3_i1 = new Vec3([1, 1, 1]);
    const vec3_i2 = new Vec3([3, -4, 5]);
    const vec3_f1 = new Vec3([-1.324, 2.546, 0.921]);
    const vec3_f2 = new Vec3([4.192, -8.006, 2.301]);

    test("add", () => {
      vec3DeepTest(vec3_i1.add(vec3_i2), new Vec3([4, -3, 6]));
      vec3DeepTest(vec3_i1.add(vec3_f1), new Vec3([-0.324, 3.546, 1.921]));
      vec3DeepTest(vec3_f1.add(vec3_f2), new Vec3([2.868, -5.46, 3.222]));
    });
    test("sub", () => {
      vec3DeepTest(vec3_i1.sub(vec3_i2), new Vec3([-2, 5, -4]));
      vec3DeepTest(vec3_i1.sub(vec3_f1), new Vec3([2.324, -1.546, 0.079]));
      vec3DeepTest(vec3_f1.sub(vec3_f2), new Vec3([-5.516, 10.552, -1.38]));
    });
    test("scale", () => {
      vec3DeepTest(vec3_i1.scale(2), new Vec3([2, 2, 2]));
      vec3DeepTest(vec3_i2.scale(5.7), new Vec3([17.1, -22.8, 28.5]));
      vec3DeepTest(vec3_f1.scale(-7.3), new Vec3([9.6652, -18.5858, -6.7233]));
    });
    test("dot", () => {
      expect(vec3_i1.dot(vec3_i2)).toBeCloseTo(4);
      expect(vec3_i1.dot(vec3_f1)).toBeCloseTo(2.143);
      expect(vec3_f1.dot(vec3_f2)).toBeCloseTo(-23.814263);
    });
    test("cross", () => {
      vec3DeepTest(vec3_i1.cross(vec3_i2), new Vec3([9, -2, -7]));
      vec3DeepTest(vec3_i1.cross(vec3_f1), new Vec3([-1.6247, -2.2453, 3.87]));
      vec3DeepTest(vec3_f1.cross(vec3_f2), new Vec3([13.2342738, 6.9086136, -0.072888]));
    });
    test("size", () => {
      expect(vec3_i1.size()).toBeCloseTo(Math.sqrt(3));
      expect(vec3_i2.size()).toBeCloseTo(Math.sqrt(50));
      expect(vec3_f1.size()).toBeCloseTo(Math.sqrt(9.083333));
    });
    test("sizeSq", () => {
      expect(vec3_i1.sizeSq()).toBeCloseTo(3);
      expect(vec3_i2.sizeSq()).toBeCloseTo(50);
      expect(vec3_f1.sizeSq()).toBeCloseTo(9.083333);
    });
    test("normalize", () => {
      vec3DeepTest(vec3_i1.normalize(), new Vec3([0.57735, 0.57735, 0.57735]));
      vec3DeepTest(vec3_i2.normalize(), new Vec3([0.424264, -0.565685, 0.707106]));
      vec3DeepTest(vec3_f1.normalize(), new Vec3([-0.439304, 0.844764, 0.305588]));
    });
    test("normalize returns zero for zero-length vectors", () => {
      vec3DeepTest(new Vec3([0, 0, 0]).normalize(), Vec3.zero());
    });
    test("lerp", () => {
      vec3DeepTest(
        Vec3.lerp(new Vec3([0, 0, 0]), new Vec3([2, -2, 4]), 0.25),
        new Vec3([0.5, -0.5, 1])
      );
    });
  });

  describe("Vec4", () => {
    const vec4_i1 = new Vec4([1, 1, 1, 1]);
    const vec4_i2 = new Vec4([3, -4, 5, 2]);
    const vec4_f1 = new Vec4([-1.324, 2.546, 0.921, 3.581]);
    const vec4_f2 = new Vec4([4.192, -8.006, 2.301, -4]);

    test("add", () => {
      vec4DeepTest(vec4_i1.add(vec4_i2), new Vec4([4, -3, 6, 3]));
      vec4DeepTest(vec4_i1.add(vec4_f1), new Vec4([-0.324, 3.546, 1.921, 4.581]));
      vec4DeepTest(vec4_f1.add(vec4_f2), new Vec4([2.868, -5.46, 3.222, -0.419]));
    });
    test("sub", () => {
      vec4DeepTest(vec4_i1.sub(vec4_i2), new Vec4([-2, 5, -4, -1]));
      vec4DeepTest(vec4_i1.sub(vec4_f1), new Vec4([2.324, -1.546, 0.079, -2.581]));
      vec4DeepTest(vec4_f1.sub(vec4_f2), new Vec4([-5.516, 10.552, -1.38, 7.581]));
    });
    test("scale", () => {
      vec4DeepTest(vec4_i1.scale(2), new Vec4([2, 2, 2, 2]));
      vec4DeepTest(vec4_i2.scale(5.7), new Vec4([17.1, -22.8, 28.5, 11.4]));
      vec4DeepTest(vec4_f1.scale(-7.3), new Vec4([9.6652, -18.5858, -6.7233, -26.1413]));
    });
    test.todo("dot", () => {
      expect(vec4_i1.dot(vec4_i2)).toBeCloseTo(4);
      expect(vec4_i1.dot(vec4_f1)).toBeCloseTo(2.143);
      expect(vec4_f1.dot(vec4_f2)).toBeCloseTo(-23.814263);
    });
    test.todo("size", () => {
      expect(vec4_i1.size()).toBeCloseTo(Math.sqrt(3));
      expect(vec4_i2.size()).toBeCloseTo(Math.sqrt(50));
      expect(vec4_f1.size()).toBeCloseTo(Math.sqrt(9.083333));
    });
    test.todo("sizeSq", () => {
      expect(vec4_i1.sizeSq()).toBeCloseTo(3);
      expect(vec4_i2.sizeSq()).toBeCloseTo(50);
      expect(vec4_f1.sizeSq()).toBeCloseTo(9.083333);
    });
    test.todo("normalize", () => {
      vec4DeepTest(vec4_i1.normalize(), new Vec4([0.57735, 0.57735, 0.57735]));
      vec4DeepTest(vec4_i2.normalize(), new Vec4([0.424264, -0.565685, 0.707106]));
      vec4DeepTest(vec4_f1.normalize(), new Vec4([-0.439304, 0.844764, 0.305588]));
    });
    test("normalize returns zero for zero-length vectors", () => {
      vec4DeepTest(new Vec4([0, 0, 0, 0]).normalize(), Vec4.zero());
    });
    test("lerp", () => {
      vec4DeepTest(
        Vec4.lerp(new Vec4([0, 0, 0, 0]), new Vec4([4, 2, -2, 6]), 0.5),
        new Vec4([2, 1, -1, 3])
      );
    });
  });
});
