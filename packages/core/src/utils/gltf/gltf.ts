interface GLTF {
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

interface GLTFAccessor {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  normalized?: boolean;
  count: number;
  type: string;
  max?: number;
  min?: number;
  sparse?: GLTFAccessorSparse;
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFAccessorSparse {
  count: number;
  indices: GLTFAccessorSparseIndices;
  values: GLTFAccessorSparseValues;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFAccessorSparseIndices {
  bufferView: number;
  byteOffset?: number;
  componentType: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFAccessorSparseValues {
  bufferView: number;
  byteOffset?: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

interface GLTFAnimation {
  channels: GLTFAnimationChannel[];
  samplers: GLTFAnimationSampler[];
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFAnimationChannel {
  sampler: number;
  target: GLTFAnimationChannelTarget;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFAnimationChannelTarget {
  node?: number;
  path: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFAnimationSampler {
  interpolation?: string;
  output: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFAsset {
  copyright?: string;
  generator?: string;
  version: string;
  minVersion?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFBuffer {
  uri?: string;
  byteLength: number;
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFBufferView {
  buffer: number;
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
  target?: number;
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

interface GLTFCamera {
  orthographic?: GLTFCameraOrthographic;
  perspective?: GLTFCameraPerspective;
  type: string;
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFCameraOrthographic {
  xmag: number;
  ymag: number;
  zfar: number;
  znear: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFCameraPerspective {
  aspectRatio?: number;
  yfov: number;
  zfar?: number;
  znear: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

interface GLTFImage {
  uri?: string;
  mimeType?: string;
  bufferView?: number;
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

interface GLTFMaterial {
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
interface GLTFMaterialNormalTextureInfo {
  index: number;
  texCoord?: number;
  scale?: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFMaterialOcclusionTextureInfo {
  index: number;
  texCoord?: number;
  strength?: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFMaterialPBRMetallicRoughness {
  baseColorFactor?: [number, number, number, number];
  baseColorTexture?: GLTFTextureInfo;
  metallicFactor?: number;
  roughnessFactor?: number;
  metallicRoughnessTexture?: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

interface GLTFMesh {
  primitives: GLTFMeshPrimitive[];
  weights?: number[];
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFMeshPrimitive {
  attributes: Object;
  indices?: number;
  material?: number;
  mode?: number;
  targets?: Object[];
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

interface GLTFNode {
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
  name?: string[];
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

interface GLTFSampler {
  magFilter?: number;
  minFilter?: number;
  wrapS?: number;
  wrapT?: number;
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

interface GLTFScene {
  nodes?: number[];
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFSkin {
  inverseBindMatrices?: number;
  skeleton?: number;
  joints: number[];
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

interface GLTFTexture {
  sampler?: number;
  source?: number;
  name?: string;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}
interface GLTFTextureInfo {
  index: number;
  texCoord?: number;
  extensions?: GLTFExtension;
  extras?: GLTFExtras;
}

type GLTFExtension = Object;
type GLTFExtras = Object;
