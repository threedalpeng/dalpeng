import { Vec3 } from "@dalpeng/math";

export default class Material {
  baseColor: Vec3 = new Vec3([1, 1, 1]);
  metallic: number = 0;
  roughness: number = 0;
  emissive: Vec3 = new Vec3([0, 0, 0]);
}
