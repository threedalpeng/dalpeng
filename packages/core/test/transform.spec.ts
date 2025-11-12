import { Vec3, vec3 } from "@dalpeng/math";
import { describe, expect, it } from "vitest";
import GameEntity from "../src/entity/GameEntity";
import Transform from "../src/Transform";

function nearly(a: number, b: number, eps = 1e-3) {
  return Math.abs(a - b) <= eps;
}
function vecNearly(a: Vec3, b: Vec3, eps = 1e-3) {
  return nearly(a.x, b.x, eps) && nearly(a.y, b.y, eps) && nearly(a.z, b.z, eps);
}

describe("Transform", () => {
  describe("lookAt and world transforms", () => {
    it("orients forward(-Z) toward target from local position", () => {
      const go = new GameEntity("cam");
      const t = go.addComponent(Transform);
      t.position = vec3(0, 2, 10);

      const target = vec3(0, -1.5, 0);
      t.lookAt(target);
      t.checkModelMatrixToBeUpdated();

      const forward = t.forward.normalize();
      const toTarget = target.sub(t.worldPosition).normalize();
      expect(vecNearly(forward, toTarget, 1e-2)).toBe(true);
    });

    it("accumulates parent->child world position correctly", () => {
      const parent = new GameEntity("p");
      const pt = parent.addComponent(Transform);
      pt.position = vec3(1, 0, 0);

      const child = new GameEntity("c");
      const ct = child.addComponent(Transform);
      ct.position = vec3(0, 0, 2);
      parent.addChild(child);

      pt.checkModelMatrixToBeUpdated();
      ct.checkModelMatrixToBeUpdated();

      expect(vecNearly(ct.worldPosition, vec3(1, 0, 2))).toBe(true);
    });
  });

  describe("hierarchy", () => {
    it("child world forward matches parent rotation when local is identity", () => {
      const parent = new GameEntity("p");
      const pt = parent.addComponent(Transform);
      pt.position = vec3(0, 0, 0);
      pt.rotate(vec3(0, 1, 0), 90);

      const child = new GameEntity("c");
      const ct = child.addComponent(Transform);
      ct.position = vec3(0, 0, 0);
      parent.addChild(child);

      pt.checkModelMatrixToBeUpdated();
      ct.checkModelMatrixToBeUpdated();

      const parentF = pt.forward.normalize();
      const childF = ct.forward.normalize();
      expect(nearly(parentF.x, childF.x)).toBe(true);
      expect(nearly(parentF.y, childF.y)).toBe(true);
      expect(nearly(parentF.z, childF.z)).toBe(true);
    });
  });

  describe("vector conversions", () => {
    it("localToWorldPoint ignores translation for direction vectors", () => {
      const go = new GameEntity("t");
      const t = go.addComponent(Transform);
      t.position = vec3(10, 0, 0);
      t.checkModelMatrixToBeUpdated();

      const v = t.localToWorldPoint(vec3(0, 1, 0));
      expect(nearly(v.x, 0)).toBe(true);
      expect(nearly(v.y, 1)).toBe(true);
      expect(nearly(v.z, 0)).toBe(true);
    });

    it("localToWorldPoint rotates vectors with rotation", () => {
      const go = new GameEntity("t");
      const t = go.addComponent(Transform);
      t.rotate(vec3(0, 0, 1), 90);
      t.checkModelMatrixToBeUpdated();

      const v = t.localToWorldPoint(vec3(1, 0, 0));
      expect(nearly(v.x, 0)).toBe(true);
      expect(nearly(v.y, 1)).toBe(true);
      expect(nearly(v.z, 0)).toBe(true);
    });
  });
});
