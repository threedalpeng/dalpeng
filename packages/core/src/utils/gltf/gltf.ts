export const enum GLTFComponentType {
  BYTE           = 5120,
  UNSIGNED_BYTE  = 5121,
  SHORT          = 5122,
  UNSIGNED_SHORT = 5123,
  UNSIGNED_INT   = 5125,
  FLOAT          = 5126,
}

export const enum GLTFPrimitiveMode {
  POINTS         = 0,
  LINES          = 1,
  LINE_LOOP      = 2,
  LINE_STRIP     = 3,
  TRIANGLES      = 4,
  TRIANGLE_STRIP = 5,
  TRIANGLE_FAN   = 6,
}

export interface GLTF {
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  accessors?: GLTFAccessor[];
  animations?: GLTFAnimation[];
  asset: GLTFAsset;
  buffers?: GLTFBuffer[];
  bufferViews?: GLTFBufferView[];
  cameras?: GLTFCamera[];
  images?: GLTFImage[];
  materials?: GLTFMaterial[];
  meshes?: GLTFMesh[];
  nodes?: GLTFNode[];
  samplers?: GLTFSampler[];
  scene?: number;
  scenes?: GLTFScene[];
  skins?: GLTFSkin[];
  textures?: GLTFTexture[];
  extensions?: GLTFExtension[];
  extras?: GLTFExtras[];
}

export interface GLTFAccessor {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  normalized?: boolean;
  count: number;
  type: string;
  max?: number[];
  min?: number[];
  sparse?: GLTFAccessorSparse;
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFAccessorSparse {
  count: number;
  indices: GLTFAccessorSparseIndices;
  values: GLTFAccessorSparseValues;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFAccessorSparseIndices {
  bufferView: number;
  byteOffset?: number;
  componentType: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFAccessorSparseValues {
  bufferView: number;
  byteOffset?: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

export interface GLTFAnimation {
  channels: GLTFAnimationChannel[];
  samplers: GLTFAnimationSampler[];
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFAnimationChannel {
  sampler: number;
  target: GLTFAnimationChannelTarget;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFAnimationChannelTarget {
  node?: number;
  path: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFAnimationSampler {
  input: number;
  interpolation?: string;
  output: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFAsset {
  copyright?: string;
  generator?: string;
  version: string;
  minVersion?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFBuffer {
  uri?: string;
  byteLength: number;
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFBufferView {
  buffer: number;
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
  target?: number;
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

export interface GLTFCamera {
  orthographic?: GLTFCameraOrthographic;
  perspective?: GLTFCameraPerspective;
  type: string;
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFCameraOrthographic {
  xmag: number;
  ymag: number;
  zfar: number;
  znear: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFCameraPerspective {
  aspectRatio?: number;
  yfov: number;
  zfar?: number;
  znear: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

export interface GLTFImage {
  uri?: string;
  mimeType?: string;
  bufferView?: number;
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

export interface GLTFMaterial {
  name?: string;
  pbrMetallicRoughness?: GLTFMaterialPBRMetallicRoughness;
  normalTexture?: GLTFMaterialNormalTextureInfo;
  occlusionTexture?: GLTFMaterialOcclusionTextureInfo;
  emissiveTexture?: GLTFTextureInfo;
  emissiveFactor?: [number, number, number];
  alphaMode?: string;
  alphaCutoff?: number;
  doubleSided?: boolean;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFMaterialNormalTextureInfo {
  index: number;
  texCoord?: number;
  scale?: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFMaterialOcclusionTextureInfo {
  index: number;
  texCoord?: number;
  strength?: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFMaterialPBRMetallicRoughness {
  baseColorFactor?: [number, number, number, number];
  baseColorTexture?: GLTFTextureInfo;
  metallicFactor?: number;
  roughnessFactor?: number;
  metallicRoughnessTexture?: GLTFTextureInfo;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

export interface GLTFMesh {
  primitives: GLTFMeshPrimitive[];
  weights?: number[];
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFMeshPrimitive {
  attributes: Record<string, number>;
  indices?: number;
  material?: number;
  mode?: number;
  targets?: Record<string, number>[];
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

export interface GLTFNode {
  camera?: number;
  children?: number[];
  skin?: number;
  // prettier-ignore
  matrix?: number[];
  mesh?: number;
  rotation?: [number, number, number, number];
  scale?: [number, number, number];
  translation?: [number, number, number];
  weights?: number[];
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

export interface GLTFSampler {
  magFilter?: number;
  minFilter?: number;
  wrapS?: number;
  wrapT?: number;
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

export interface GLTFScene {
  nodes?: number[];
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFSkin {
  inverseBindMatrices?: number;
  skeleton?: number;
  joints: number[];
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

export interface GLTFTexture {
  sampler?: number;
  source?: number;
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
export interface GLTFTextureInfo {
  index: number;
  texCoord?: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

export type GLTFExtension = Record<string, unknown>;
export type GLTFExtras = unknown;
