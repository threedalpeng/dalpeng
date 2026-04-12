/**
 * Intermediate representation of a parsed glTF document.
 * Pure data — no GPU resources. Safe to create before WebGL context exists.
 */

/** Joints and weights for a skinned primitive. */
export interface ParsedSkinVertexData {
  joints: Uint8Array | Uint16Array; // 4 joint indices per vertex (ivec4)
  weights: Float32Array; // 4 weights per vertex (vec4)
}

/** A skin definition (maps joint nodes to inverse bind matrices). */
export interface ParsedSkin {
  name: string;
  joints: number[]; // indices into nodes[]
  inverseBindMatrices: Float32Array; // N * 16 floats (N mat4s, column-major)
  skeleton: number | null; // optional skeleton root node index
}

/** A parsed animation channel target. */
export interface ParsedAnimationChannel {
  nodeIndex: number;
  path: "translation" | "rotation" | "scale" | "weights";
  samplerIndex: number;
}

/** A parsed animation sampler with resolved keyframe data. */
export interface ParsedAnimationSampler {
  input: Float32Array; // keyframe times
  output: Float32Array; // keyframe values
  interpolation: "STEP" | "LINEAR" | "CUBICSPLINE";
}

/** A parsed animation clip. */
export interface ParsedAnimation {
  name: string;
  channels: ParsedAnimationChannel[];
  samplers: ParsedAnimationSampler[];
  duration: number; // max keyframe time
}

/** A single primitive within a mesh, fully resolved from accessor chain. */
export interface ParsedPrimitive {
  position: Float32Array;
  normal: Float32Array | null;
  texcoord: Float32Array | null;
  texcoord1: Float32Array | null;
  tangent: Float32Array | null;
  indices: Uint16Array | Uint32Array | null;
  materialIndex: number | null;
  mode: number;
  skinData: ParsedSkinVertexData | null; // NEW
}

/** A mesh is a collection of primitives (each may have its own material). */
export interface ParsedMesh {
  name: string;
  primitives: ParsedPrimitive[];
}

/** UV transform from KHR_texture_transform. */
export interface ParsedTexTransform {
  offset: [number, number];
  rotation: number;
  scale: [number, number];
}

/** PBR material data as extracted from glTF, before GPU upload. */
export interface ParsedMaterial {
  name: string;
  baseColorFactor: [number, number, number, number];
  metallicFactor: number;
  roughnessFactor: number;
  emissiveFactor: [number, number, number];
  baseColorTextureIndex: number | null;
  normalTextureIndex: number | null;
  normalTextureScale: number;
  metallicRoughnessTextureIndex: number | null;
  emissiveTextureIndex: number | null;
  occlusionTextureIndex: number | null;
  occlusionStrength: number;
  alphaMode: "OPAQUE" | "MASK" | "BLEND";
  alphaCutoff: number;
  doubleSided: boolean;
  unlit: boolean;
  texTransform: ParsedTexTransform | null;
}

/** Image as raw bytes, ready for createImageBitmap. */
export interface ParsedImage {
  name: string;
  mimeType: string;
  data: ArrayBuffer;
}

/** Camera as extracted from glTF. */
export interface ParsedCamera {
  name: string;
  type: "perspective" | "orthographic";
  yfov: number;
  aspectRatio: number | null;
  znear: number;
  zfar: number;
  xmag: number;
  ymag: number;
}

/** Light from KHR_lights_punctual. */
export interface ParsedLight {
  name: string;
  type: "directional" | "point" | "spot";
  color: [number, number, number];
  intensity: number;
  range: number;
  innerConeAngle: number;
  outerConeAngle: number;
}

/** Node in the scene hierarchy. */
export interface ParsedNode {
  name: string;
  translation: [number, number, number];
  rotation: [number, number, number, number];
  scale: [number, number, number];
  meshIndex: number | null;
  cameraIndex: number | null;
  lightIndex: number | null;
  children: number[];
  skinIndex: number | null;
}

/** Top-level parsed document. */
export interface ParsedGLTFDocument {
  nodes: ParsedNode[];
  meshes: ParsedMesh[];
  materials: ParsedMaterial[];
  images: ParsedImage[];
  textures: Array<{ imageIndex: number; samplerIndex: number | null }>;
  cameras: ParsedCamera[];
  lights: ParsedLight[];
  defaultSceneRootNodes: number[];
  skins: ParsedSkin[]; // NEW
  animations: ParsedAnimation[]; // NEW
}
