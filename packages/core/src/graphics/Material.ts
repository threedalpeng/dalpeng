import type GfxTexture from "@/gfx/Texture";
import { Vec3 } from "@dalpeng/math";

export const enum MaterialTexFlag {
  NONE = 0,
  BASE_COLOR = 1 << 0,
  NORMAL = 1 << 1,
  METALLIC_ROUGH = 1 << 2,
  EMISSIVE = 1 << 3,
  HAS_TANGENT = 1 << 4,
  OCCLUSION = 1 << 5,
}

export type AlphaMode = "OPAQUE" | "MASK";

const IDENTITY_MAT3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

export default class Material {
  baseColor: Vec3 = new Vec3([1, 1, 1]);
  metallic: number = 0;
  roughness: number = 0;
  emissive: Vec3 = new Vec3([0, 0, 0]);

  baseColorMap: GfxTexture | null = null;
  normalMap: GfxTexture | null = null;
  metallicRoughnessMap: GfxTexture | null = null;
  emissiveMap: GfxTexture | null = null;
  occlusionMap: GfxTexture | null = null;
  occlusionStrength: number = 1.0;

  hasTangent: boolean = false;
  doubleSided: boolean = false;
  alphaMode: AlphaMode = "OPAQUE";
  alphaCutoff: number = 0.5;
  unlit: boolean = false;
  texTransform: Float32Array = IDENTITY_MAT3;

  get texFlags(): number {
    let flags = 0;
    if (this.baseColorMap) flags |= MaterialTexFlag.BASE_COLOR;
    if (this.normalMap) flags |= MaterialTexFlag.NORMAL;
    if (this.metallicRoughnessMap) flags |= MaterialTexFlag.METALLIC_ROUGH;
    if (this.emissiveMap) flags |= MaterialTexFlag.EMISSIVE;
    if (this.hasTangent) flags |= MaterialTexFlag.HAS_TANGENT;
    if (this.occlusionMap) flags |= MaterialTexFlag.OCCLUSION;
    return flags;
  }
}
