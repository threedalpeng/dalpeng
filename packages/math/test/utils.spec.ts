import { describe, expect, test } from "vitest";
import { deg2rad, rad2deg } from "../src/utils";

describe("utils", () => {
  test("deg2rad", () => {
    const deg = 48;
    expect(deg2rad(deg)).toBeCloseTo(0.837758);
  });
  test("rad2deg", () => {
    const rad = 1.3;
    expect(rad2deg(rad)).toBeCloseTo(74.4845);
  });
});
