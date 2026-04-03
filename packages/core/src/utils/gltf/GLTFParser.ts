import type { GLTF } from "./gltf";
import type {
  ParsedGLTFDocument,
  ParsedImage,
  ParsedMaterial,
  ParsedMesh,
  ParsedNode,
  ParsedPrimitive,
  ParsedCamera,
  ParsedLight,
  ParsedTexTransform,
  ParsedSkin,
  ParsedAnimation,
  ParsedAnimationChannel,
  ParsedAnimationSampler,
  ParsedSkinVertexData,
} from "./GLTFDocument";

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Uint32Array
  | Float32Array;

interface ResolvedAccessor {
  data: TypedArray;
  componentCount: number;
}

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const CHUNK_TYPE_JSON = 0x4e4f534a;
const CHUNK_TYPE_BIN = 0x004e4942;

function getComponentCount(type: string): number {
  switch (type) {
    case "SCALAR":
      return 1;
    case "VEC2":
      return 2;
    case "VEC3":
      return 3;
    case "VEC4":
      return 4;
    case "MAT2":
      return 4;
    case "MAT3":
      return 9;
    case "MAT4":
      return 16;
    default:
      throw new Error(`Unknown accessor type: ${type}`);
  }
}

function getBytesPerComponent(componentType: number): number {
  switch (componentType) {
    case 5120: // BYTE
    case 5121: // UNSIGNED_BYTE
      return 1;
    case 5122: // SHORT
    case 5123: // UNSIGNED_SHORT
      return 2;
    case 5125: // UNSIGNED_INT
    case 5126: // FLOAT
      return 4;
    default:
      throw new Error(`Unknown componentType: ${componentType}`);
  }
}

type TypedArrayConstructor =
  | typeof Int8Array
  | typeof Uint8Array
  | typeof Int16Array
  | typeof Uint16Array
  | typeof Uint32Array
  | typeof Float32Array;

function getTypedArrayConstructor(componentType: number): TypedArrayConstructor {
  switch (componentType) {
    case 5120:
      return Int8Array;
    case 5121:
      return Uint8Array;
    case 5122:
      return Int16Array;
    case 5123:
      return Uint16Array;
    case 5125:
      return Uint32Array;
    case 5126:
      return Float32Array;
    default:
      throw new Error(`Unknown componentType: ${componentType}`);
  }
}

function resolveAccessor(
  json: GLTF,
  buffers: ArrayBuffer[],
  accessorIndex: number,
): ResolvedAccessor {
  const accessor = json.accessors![accessorIndex];
  const componentCount = getComponentCount(accessor.type);
  const totalElements = accessor.count * componentCount;
  const Ctor = getTypedArrayConstructor(accessor.componentType);

  let data: TypedArray;

  if (accessor.bufferView === undefined) {
    data = new Ctor(totalElements);
  } else {
    const bufferView = json.bufferViews![accessor.bufferView];
    const buffer = buffers[bufferView.buffer];
    const bufferViewByteOffset = bufferView.byteOffset ?? 0;
    const accessorByteOffset = accessor.byteOffset ?? 0;
    const totalByteOffset = bufferViewByteOffset + accessorByteOffset;

    const bytesPerComponent = getBytesPerComponent(accessor.componentType);
    const byteStride = bufferView.byteStride ?? 0;

    if (byteStride === 0 || byteStride === componentCount * bytesPerComponent) {
      const byteLength = accessor.count * componentCount * bytesPerComponent;
      const sliced = buffer.slice(totalByteOffset, totalByteOffset + byteLength);
      data = new Ctor(sliced);
    } else {
      data = new Ctor(totalElements);
      const srcBytes = new Uint8Array(buffer);
      const dstBytes = new Uint8Array(data.buffer);
      const elementByteSize = componentCount * bytesPerComponent;

      for (let i = 0; i < accessor.count; i++) {
        const srcByteOffset = totalByteOffset + i * byteStride;
        const dstByteOffset = i * elementByteSize;
        for (let b = 0; b < elementByteSize; b++) {
          dstBytes[dstByteOffset + b] = srcBytes[srcByteOffset + b];
        }
      }
    }
  }

  // Sparse accessor overlay
  if (accessor.sparse) {
    const sparse = accessor.sparse;
    const indicesBV = json.bufferViews![sparse.indices.bufferView];
    const indicesBuffer = buffers[indicesBV.buffer];
    const indicesOffset = (indicesBV.byteOffset ?? 0) + (sparse.indices.byteOffset ?? 0);
    const IndicesCtor = getTypedArrayConstructor(sparse.indices.componentType);
    const indicesByteLen = sparse.count * getBytesPerComponent(sparse.indices.componentType);
    const sparseIndices = new IndicesCtor(
      indicesBuffer.slice(indicesOffset, indicesOffset + indicesByteLen)
    );

    const valuesBV = json.bufferViews![sparse.values.bufferView];
    const valuesBuffer = buffers[valuesBV.buffer];
    const valuesOffset = (valuesBV.byteOffset ?? 0) + (sparse.values.byteOffset ?? 0);
    const valuesByteLen = sparse.count * componentCount * getBytesPerComponent(accessor.componentType);
    const sparseValues = new Ctor(
      valuesBuffer.slice(valuesOffset, valuesOffset + valuesByteLen)
    );

    for (let i = 0; i < sparse.count; i++) {
      const targetIndex = sparseIndices[i];
      for (let c = 0; c < componentCount; c++) {
        data[targetIndex * componentCount + c] = sparseValues[i * componentCount + c];
      }
    }
  }

  return { data, componentCount };
}

function parseMeshes(json: GLTF, buffers: ArrayBuffer[]): ParsedMesh[] {
  if (!json.meshes) return [];

  return json.meshes.map((mesh, i) => {
    const name = mesh.name ?? `mesh_${i}`;
    const primitives: ParsedPrimitive[] = mesh.primitives.map((prim) => {
      const positionAccessor = resolveAccessor(
        json,
        buffers,
        prim.attributes["POSITION"],
      );
      const position = positionAccessor.data as Float32Array;

      let normal: Float32Array | null = null;
      if (prim.attributes["NORMAL"] !== undefined) {
        normal = resolveAccessor(json, buffers, prim.attributes["NORMAL"])
          .data as Float32Array;
      }

      let texcoord: Float32Array | null = null;
      if (prim.attributes["TEXCOORD_0"] !== undefined) {
        texcoord = resolveAccessor(
          json,
          buffers,
          prim.attributes["TEXCOORD_0"],
        ).data as Float32Array;
      }

      let tangent: Float32Array | null = null;
      if (prim.attributes["TANGENT"] !== undefined) {
        tangent = resolveAccessor(json, buffers, prim.attributes["TANGENT"])
          .data as Float32Array;
      }

      let texcoord1: Float32Array | null = null;
      if (prim.attributes["TEXCOORD_1"] !== undefined) {
        texcoord1 = resolveAccessor(
          json,
          buffers,
          prim.attributes["TEXCOORD_1"],
        ).data as Float32Array;
      }

      let skinData: ParsedSkinVertexData | null = null;
      if (prim.attributes['JOINTS_0'] !== undefined &&
          prim.attributes['WEIGHTS_0'] !== undefined) {
        const jointsResolved = resolveAccessor(json, buffers, prim.attributes['JOINTS_0']);
        const weightsResolved = resolveAccessor(json, buffers, prim.attributes['WEIGHTS_0']);
        skinData = {
          joints: jointsResolved.data as Uint8Array | Uint16Array,
          weights: weightsResolved.data as Float32Array,
        };
      }

      let indices: Uint16Array | Uint32Array | null = null;
      if (prim.indices !== undefined) {
        const resolved = resolveAccessor(json, buffers, prim.indices);
        const accessor = json.accessors![prim.indices];
        if (accessor.componentType === 5125) {
          indices = resolved.data as Uint32Array;
        } else {
          indices = resolved.data as Uint16Array;
        }
      }

      const materialIndex = prim.material ?? null;
      const mode = prim.mode ?? 4;

      return { position, normal, texcoord, texcoord1, tangent, indices, materialIndex, mode, skinData };
    });

    return { name, primitives };
  });
}

function parseTexTransform(texInfo: any): ParsedTexTransform | null {
  const ext = texInfo?.extensions?.KHR_texture_transform;
  if (!ext) return null;
  return {
    offset: ext.offset ?? [0, 0],
    rotation: ext.rotation ?? 0,
    scale: ext.scale ?? [1, 1],
  };
}

function parseMaterials(json: GLTF): ParsedMaterial[] {
  if (!json.materials) return [];

  return json.materials.map((mat, i) => {
    const name = mat.name ?? `material_${i}`;
    const pbr = mat.pbrMetallicRoughness;

    return {
      name,
      baseColorFactor: pbr?.baseColorFactor ?? [1, 1, 1, 1],
      metallicFactor: pbr?.metallicFactor ?? 1,
      roughnessFactor: pbr?.roughnessFactor ?? 1,
      emissiveFactor: mat.emissiveFactor ?? [0, 0, 0],
      baseColorTextureIndex: pbr?.baseColorTexture?.index ?? null,
      normalTextureIndex: mat.normalTexture?.index ?? null,
      normalTextureScale: mat.normalTexture?.scale ?? 1.0,
      metallicRoughnessTextureIndex:
        pbr?.metallicRoughnessTexture?.index ?? null,
      emissiveTextureIndex: mat.emissiveTexture?.index ?? null,
      occlusionTextureIndex: mat.occlusionTexture?.index ?? null,
      occlusionStrength: mat.occlusionTexture?.strength ?? 1.0,
      alphaMode: (mat.alphaMode ?? "OPAQUE") as "OPAQUE" | "MASK" | "BLEND",
      alphaCutoff: mat.alphaCutoff ?? 0.5,
      doubleSided: mat.doubleSided ?? false,
      unlit: !!(mat.extensions as any)?.KHR_materials_unlit,
      texTransform: parseTexTransform(pbr?.baseColorTexture),
    };
  });
}

function dataURIToArrayBuffer(dataURI: string): {
  buffer: ArrayBuffer;
  mimeType: string;
} {
  // Format: data:<mimeType>;base64,<data>
  const commaIdx = dataURI.indexOf(",");
  const header = dataURI.slice(5, commaIdx); // strip "data:"
  const base64Data = dataURI.slice(commaIdx + 1);
  const mimeType = header.split(";")[0];

  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return { buffer: bytes.buffer, mimeType };
}

async function parseImages(
  json: GLTF,
  buffers: ArrayBuffer[],
  baseURL?: string,
): Promise<ParsedImage[]> {
  if (!json.images) return [];

  return Promise.all(
    json.images.map(async (img, i) => {
      const name = img.name ?? `image_${i}`;

      if (img.bufferView !== undefined) {
        const bufferView = json.bufferViews![img.bufferView];
        const buffer = buffers[bufferView.buffer];
        const byteOffset = bufferView.byteOffset ?? 0;
        const data = buffer.slice(byteOffset, byteOffset + bufferView.byteLength);
        const mimeType = img.mimeType ?? "image/png";
        return { name, mimeType, data };
      } else if (img.uri !== undefined) {
        const uri = img.uri;
        if (uri.startsWith("data:")) {
          const { buffer, mimeType } = dataURIToArrayBuffer(uri);
          return { name, mimeType, data: buffer };
        } else {
          const fetchURL = baseURL ? new URL(uri, baseURL).href : uri;
          const response = await fetch(fetchURL);
          const data = await response.arrayBuffer();
          const mimeType =
            response.headers.get("Content-Type") ??
            img.mimeType ??
            "image/png";
          return { name, mimeType, data };
        }
      } else {
        throw new Error(
          `[GLTFParser] Image at index ${i} has neither bufferView nor uri.`,
        );
      }
    }),
  );
}

function matrixToTRS(matrix: number[]): {
  translation: [number, number, number];
  rotation: [number, number, number, number];
  scale: [number, number, number];
} {
  const m = matrix;

  // Translation
  const translation: [number, number, number] = [m[12], m[13], m[14]];

  // Scale: length of each column
  const sx = Math.hypot(m[0], m[1], m[2]);
  const sy = Math.hypot(m[4], m[5], m[6]);
  const sz = Math.hypot(m[8], m[9], m[10]);
  const scale: [number, number, number] = [sx, sy, sz];

  // Rotation matrix (column-major): normalize each column by scale
  // r is indexed as: r[row + col*3] but we index like: r[0..8] = col0.xyz, col1.xyz, col2.xyz
  // Using flat indexing: r[0]=m[0]/sx, r[1]=m[1]/sx, r[2]=m[2]/sx (col 0)
  //                      r[3]=m[4]/sy, r[4]=m[5]/sy, r[5]=m[6]/sy (col 1)
  //                      r[6]=m[8]/sz, r[7]=m[9]/sz, r[8]=m[10]/sz (col 2)
  const r = [
    m[0] / sx,  m[1] / sx,  m[2] / sx,
    m[4] / sy,  m[5] / sy,  m[6] / sy,
    m[8] / sz,  m[9] / sz,  m[10] / sz,
  ];

  // Shepperd's method: quaternion from rotation matrix
  // r[row*3+col] convention here: r[0]=r00, r[1]=r10, r[2]=r20, r[3]=r01, r[4]=r11, r[5]=r21, r[6]=r02, r[7]=r12, r[8]=r22
  // But per spec: r[0]=m[0], r[1]=m[1], r[2]=m[2], r[3]=m[4], r[4]=m[5], r[5]=m[6], r[6]=m[8], r[7]=m[9], r[8]=m[10]
  // This is column-major: r[col*3+row]
  // For trace: diagonal elements are r[0] (col0,row0), r[4] (col1,row1), r[8] (col2,row2)
  const trace = r[0] + r[4] + r[8];

  let x: number, y: number, z: number, w: number;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    w = 0.25 / s;
    x = (r[5] - r[7]) * s;
    y = (r[6] - r[2]) * s;
    z = (r[1] - r[3]) * s;
  } else if (r[0] > r[4] && r[0] > r[8]) {
    const s = 2.0 * Math.sqrt(1.0 + r[0] - r[4] - r[8]);
    w = (r[5] - r[7]) / s;
    x = 0.25 * s;
    y = (r[3] + r[1]) / s;
    z = (r[6] + r[2]) / s;
  } else if (r[4] > r[8]) {
    const s = 2.0 * Math.sqrt(1.0 + r[4] - r[0] - r[8]);
    w = (r[6] - r[2]) / s;
    x = (r[3] + r[1]) / s;
    y = 0.25 * s;
    z = (r[7] + r[5]) / s;
  } else {
    const s = 2.0 * Math.sqrt(1.0 + r[8] - r[0] - r[4]);
    w = (r[1] - r[3]) / s;
    x = (r[6] + r[2]) / s;
    y = (r[7] + r[5]) / s;
    z = 0.25 * s;
  }

  const rotation: [number, number, number, number] = [x, y, z, w];
  return { translation, rotation, scale };
}

function parseCameras(json: GLTF): ParsedCamera[] {
  if (!json.cameras) return [];

  return json.cameras.map((cam, i) => {
    const name = cam.name ?? `camera_${i}`;
    if (cam.type === "perspective") {
      const p = cam.perspective!;
      return {
        name,
        type: "perspective" as const,
        yfov: p.yfov,
        aspectRatio: p.aspectRatio ?? null,
        znear: p.znear,
        zfar: p.zfar ?? 1000,
        xmag: 0,
        ymag: 0,
      };
    } else {
      const o = cam.orthographic!;
      return {
        name,
        type: "orthographic" as const,
        yfov: 0,
        aspectRatio: null,
        znear: o.znear,
        zfar: o.zfar,
        xmag: o.xmag,
        ymag: o.ymag,
      };
    }
  });
}

function parseLights(json: GLTF): ParsedLight[] {
  const ext = (json.extensions as any)?.KHR_lights_punctual;
  if (!ext?.lights) return [];

  return ext.lights.map((light: any, i: number) => ({
    name: light.name ?? `light_${i}`,
    type: light.type as "directional" | "point" | "spot",
    color: light.color ?? [1, 1, 1],
    intensity: light.intensity ?? 1,
    range: light.range ?? Infinity,
    innerConeAngle: light.spot?.innerConeAngle ?? 0,
    outerConeAngle: light.spot?.outerConeAngle ?? Math.PI / 4,
  }));
}

function parseNodes(json: GLTF): ParsedNode[] {
  if (!json.nodes) return [];

  return json.nodes.map((node, i) => {
    const name = node.name ?? `node_${i}`;
    const children = node.children ?? [];
    const meshIndex = node.mesh ?? null;
    const cameraIndex = node.camera ?? null;
    const lightIndex = (node.extensions as any)?.KHR_lights_punctual?.light ?? null;

    let translation: [number, number, number];
    let rotation: [number, number, number, number];
    let scale: [number, number, number];

    if (node.matrix !== undefined) {
      const trs = matrixToTRS(node.matrix);
      translation = trs.translation;
      rotation = trs.rotation;
      scale = trs.scale;
    } else {
      translation = node.translation ?? [0, 0, 0];
      rotation = node.rotation ?? [0, 0, 0, 1];
      scale = node.scale ?? [1, 1, 1];
    }

    const skinIndex = node.skin ?? null;
    return { name, translation, rotation, scale, meshIndex, cameraIndex, lightIndex, children, skinIndex };
  });
}

function parseTextures(
  json: GLTF,
): Array<{ imageIndex: number; samplerIndex: number | null }> {
  if (!json.textures) return [];

  return json.textures.map((tex) => ({
    imageIndex: tex.source ?? 0,
    samplerIndex: tex.sampler ?? null,
  }));
}

function parseSkins(json: GLTF, buffers: ArrayBuffer[]): ParsedSkin[] {
  if (!json.skins) return [];
  return json.skins.map((skin, i) => {
    const name = skin.name ?? `skin_${i}`;
    const joints = skin.joints;
    const skeleton = skin.skeleton ?? null;

    let inverseBindMatrices: Float32Array;
    if (skin.inverseBindMatrices !== undefined) {
      const resolved = resolveAccessor(json, buffers, skin.inverseBindMatrices);
      inverseBindMatrices = resolved.data as Float32Array;
    } else {
      // Default to identity matrices
      inverseBindMatrices = new Float32Array(joints.length * 16);
      for (let j = 0; j < joints.length; j++) {
        inverseBindMatrices[j * 16 + 0] = 1;
        inverseBindMatrices[j * 16 + 5] = 1;
        inverseBindMatrices[j * 16 + 10] = 1;
        inverseBindMatrices[j * 16 + 15] = 1;
      }
    }

    return { name, joints, inverseBindMatrices, skeleton };
  });
}

function parseAnimations(json: GLTF, buffers: ArrayBuffer[]): ParsedAnimation[] {
  if (!json.animations) return [];
  return json.animations.map((anim, i) => {
    const name = anim.name ?? `animation_${i}`;

    const samplers: ParsedAnimationSampler[] = anim.samplers.map((s) => {
      const input = resolveAccessor(json, buffers, s.input).data as Float32Array;
      const output = resolveAccessor(json, buffers, s.output).data as Float32Array;
      const interpolation = (s.interpolation ?? 'LINEAR') as 'STEP' | 'LINEAR' | 'CUBICSPLINE';
      return { input, output, interpolation };
    });

    const channels: ParsedAnimationChannel[] = anim.channels
      .filter(c => c.target.node !== undefined)
      .map((c) => ({
        nodeIndex: c.target.node!,
        path: c.target.path as 'translation' | 'rotation' | 'scale' | 'weights',
        samplerIndex: c.sampler,
      }));

    // Duration = max of all sampler input times
    let duration = 0;
    for (const s of samplers) {
      if (s.input.length > 0) {
        duration = Math.max(duration, s.input[s.input.length - 1]);
      }
    }

    return { name, channels, samplers, duration };
  });
}

async function parse(
  json: GLTF,
  buffers: ArrayBuffer[],
  baseURL?: string,
): Promise<ParsedGLTFDocument> {
  const meshes = parseMeshes(json, buffers);
  const materials = parseMaterials(json);
  const images = await parseImages(json, buffers, baseURL);
  const nodes = parseNodes(json);
  const textures = parseTextures(json);
  const cameras = parseCameras(json);
  const lights = parseLights(json);
  const skins = parseSkins(json, buffers);
  const animations = parseAnimations(json, buffers);

  const defaultScene = json.scene ?? 0;
  const sceneDesc = json.scenes?.[defaultScene];
  const defaultSceneRootNodes = sceneDesc?.nodes ?? [];

  return { nodes, meshes, materials, images, textures, cameras, lights, defaultSceneRootNodes, skins, animations };
}

export class GLTFParser {
  static async fromURL(url: string): Promise<ParsedGLTFDocument> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    // Check GLB magic: first 4 bytes little-endian = 0x46546C67
    const view = new DataView(buffer);
    const magic = view.getUint32(0, true);

    if (magic === GLB_MAGIC) {
      return GLTFParser.fromGLB(buffer);
    } else {
      const text = new TextDecoder().decode(buffer);
      const json = JSON.parse(text) as GLTF;
      const baseURL = new URL(".", url).href;
      return GLTFParser.fromGLTF(json, baseURL);
    }
  }

  static async fromGLB(buffer: ArrayBuffer): Promise<ParsedGLTFDocument> {
    const view = new DataView(buffer);

    const magic = view.getUint32(0, true);
    const version = view.getUint32(4, true);
    // const length = view.getUint32(8, true); // total file length, unused

    if (magic !== GLB_MAGIC) {
      throw new Error(
        `[GLTFParser] Invalid GLB magic: expected 0x${GLB_MAGIC.toString(16)}, got 0x${magic.toString(16)}`,
      );
    }
    if (version !== GLB_VERSION) {
      throw new Error(
        `[GLTFParser] Unsupported GLB version: ${version}. Expected ${GLB_VERSION}.`,
      );
    }

    let json: GLTF | null = null;
    let binChunk: ArrayBuffer | null = null;
    let offset = 12;

    while (offset < buffer.byteLength) {
      const chunkLength = view.getUint32(offset, true);
      const chunkType = view.getUint32(offset + 4, true);
      const chunkDataStart = offset + 8;

      if (chunkType === CHUNK_TYPE_JSON) {
        const jsonBytes = buffer.slice(chunkDataStart, chunkDataStart + chunkLength);
        const jsonText = new TextDecoder().decode(jsonBytes);
        json = JSON.parse(jsonText) as GLTF;
      } else if (chunkType === CHUNK_TYPE_BIN) {
        binChunk = buffer.slice(chunkDataStart, chunkDataStart + chunkLength);
      }

      offset = chunkDataStart + chunkLength;
    }

    if (!json) {
      throw new Error("[GLTFParser] GLB file is missing JSON chunk.");
    }

    const buffers: ArrayBuffer[] = binChunk ? [binChunk] : [];
    return parse(json, buffers);
  }

  static async fromGLTF(json: GLTF, baseURL: string): Promise<ParsedGLTFDocument> {
    const buffers: ArrayBuffer[] = [];

    if (json.buffers) {
      for (const buf of json.buffers) {
        if (!buf.uri) {
          // No URI — may be a GLB-embedded buffer with no URI (already resolved elsewhere)
          buffers.push(new ArrayBuffer(0));
          continue;
        }

        if (buf.uri.startsWith("data:")) {
          const { buffer } = dataURIToArrayBuffer(buf.uri);
          buffers.push(buffer);
        } else {
          const fetchURL = new URL(buf.uri, baseURL).href;
          const response = await fetch(fetchURL);
          const data = await response.arrayBuffer();
          buffers.push(data);
        }
      }
    }

    return parse(json, buffers, baseURL);
  }
}
