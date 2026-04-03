import type { RendererBackend } from "../gfx/RendererBackend";
import type GfxTexture from "../gfx/Texture";
import { GLTFParser } from "../utils/gltf/GLTFParser";
import type {
  ParsedGLTFDocument,
  ParsedMaterial,
  ParsedMesh,
  ParsedNode,
  ParsedCamera,
  ParsedLight,
  ParsedSkin,
  ParsedAnimation,
} from "../utils/gltf/GLTFDocument";
import Material from "../graphics/Material";
import type { Mesh } from "../utils/mesh";
import { Vec3 } from "@dalpeng/math";

export interface GPUPrimitive {
  mesh: Mesh;
  material: Material;
  skinData?: { joints: Uint8Array | Uint16Array; weights: Float32Array } | null;
}

export interface GPUMesh {
  name: string;
  primitives: GPUPrimitive[];
}

export interface ModelAsset {
  meshes: GPUMesh[];
  rootNodes: number[];
  nodes: ParsedNode[];
  textures: (GfxTexture | null)[];
  cameras: ParsedCamera[];
  lights: ParsedLight[];
  skins: ParsedSkin[];
  animations: ParsedAnimation[];
}

export default class ModelManager {
  #renderer!: RendererBackend;
  #cache = new Map<string, ModelAsset>();
  #loading = new Map<string, Promise<ModelAsset>>();
  #initPromise: Promise<void>;
  #resolveInit!: () => void;

  constructor() {
    this.#initPromise = new Promise<void>((resolve) => {
      this.#resolveInit = resolve;
    });
  }

  init(renderer: RendererBackend): void {
    this.#renderer = renderer;
    this.#resolveInit();
  }

  async load(url: string): Promise<ModelAsset> {
    await this.#initPromise;
    if (this.#cache.has(url)) return this.#cache.get(url)!;
    if (this.#loading.has(url)) return this.#loading.get(url)!;
    const promise = this.#doLoad(url);
    this.#loading.set(url, promise);
    const asset = await promise;
    this.#loading.delete(url);
    this.#cache.set(url, asset);
    return asset;
  }

  get(url: string): ModelAsset | undefined {
    return this.#cache.get(url);
  }

  dispose(): void {
    for (const asset of this.#cache.values()) {
      for (const tex of asset.textures) {
        tex?.dispose();
      }
    }
    this.#cache.clear();
    this.#loading.clear();
  }

  async #doLoad(url: string): Promise<ModelAsset> {
    const doc = await GLTFParser.fromURL(url);

    // 1. Upload images to GPU textures
    const gpuTextures = await this.#uploadTextures(doc);

    // 2. Build Material objects from parsed materials
    const materials = doc.materials.map((parsedMat) =>
      this.#buildMaterial(parsedMat, gpuTextures, doc)
    );

    // 3. Build GPU meshes from parsed meshes
    const meshes = doc.meshes.map((parsedMesh) =>
      this.#buildMesh(parsedMesh, materials)
    );

    return {
      meshes,
      rootNodes: doc.defaultSceneRootNodes,
      nodes: doc.nodes,
      textures: gpuTextures,
      cameras: doc.cameras,
      lights: doc.lights,
      skins: doc.skins,
      animations: doc.animations,
    };
  }

  async #uploadTextures(
    doc: ParsedGLTFDocument
  ): Promise<(GfxTexture | null)[]> {
    if (doc.images.length === 0) return [];

    // Determine which images need sRGB vs linear
    const imageUsage = new Map<number, "srgb" | "linear">();

    for (const mat of doc.materials) {
      // baseColor and emissive textures are sRGB
      if (mat.baseColorTextureIndex !== null) {
        const imgIdx = doc.textures[mat.baseColorTextureIndex]?.imageIndex;
        if (imgIdx !== undefined) imageUsage.set(imgIdx, "srgb");
      }
      if (mat.emissiveTextureIndex !== null) {
        const imgIdx = doc.textures[mat.emissiveTextureIndex]?.imageIndex;
        if (imgIdx !== undefined) imageUsage.set(imgIdx, "srgb");
      }
      // normal and metallic-roughness are linear (don't override sRGB if already set)
      if (mat.normalTextureIndex !== null) {
        const imgIdx = doc.textures[mat.normalTextureIndex]?.imageIndex;
        if (imgIdx !== undefined && !imageUsage.has(imgIdx))
          imageUsage.set(imgIdx, "linear");
      }
      if (mat.metallicRoughnessTextureIndex !== null) {
        const imgIdx =
          doc.textures[mat.metallicRoughnessTextureIndex]?.imageIndex;
        if (imgIdx !== undefined && !imageUsage.has(imgIdx))
          imageUsage.set(imgIdx, "linear");
      }
      // occlusion texture is linear
      if (mat.occlusionTextureIndex !== null) {
        const imgIdx = doc.textures[mat.occlusionTextureIndex]?.imageIndex;
        if (imgIdx !== undefined && !imageUsage.has(imgIdx))
          imageUsage.set(imgIdx, "linear");
      }
    }

    return Promise.all(
      doc.images.map(async (img, i) => {
        const blob = new Blob([img.data], { type: img.mimeType });
        const bitmap = await createImageBitmap(blob, {
          colorSpaceConversion: "none",
          premultiplyAlpha: "none",
        });

        const usage = imageUsage.get(i) ?? "srgb";
        const format = usage === "srgb" ? "srgba8unorm" : "rgba8unorm";

        const tex = this.#renderer.createTexture!({
          kind: "2d",
          width: bitmap.width,
          height: bitmap.height,
          format,
          mipLevels: 0, // auto mip levels
        });
        tex.update2D(bitmap);
        tex.generateMipmaps?.();
        bitmap.close();
        return tex;
      })
    );
  }

  #buildMaterial(
    parsed: ParsedMaterial,
    textures: (GfxTexture | null)[],
    doc: ParsedGLTFDocument
  ): Material {
    const mat = new Material();
    mat.baseColor = new Vec3([
      parsed.baseColorFactor[0],
      parsed.baseColorFactor[1],
      parsed.baseColorFactor[2],
    ]);
    mat.metallic = parsed.metallicFactor;
    mat.roughness = parsed.roughnessFactor;
    mat.emissive = new Vec3(parsed.emissiveFactor);

    // Resolve texture indices through the glTF textures array
    if (parsed.baseColorTextureIndex !== null) {
      const glTFTex = doc.textures[parsed.baseColorTextureIndex];
      if (glTFTex) mat.baseColorMap = textures[glTFTex.imageIndex] ?? null;
    }
    if (parsed.normalTextureIndex !== null) {
      const glTFTex = doc.textures[parsed.normalTextureIndex];
      if (glTFTex) mat.normalMap = textures[glTFTex.imageIndex] ?? null;
    }
    if (parsed.metallicRoughnessTextureIndex !== null) {
      const glTFTex = doc.textures[parsed.metallicRoughnessTextureIndex];
      if (glTFTex)
        mat.metallicRoughnessMap = textures[glTFTex.imageIndex] ?? null;
    }
    if (parsed.emissiveTextureIndex !== null) {
      const glTFTex = doc.textures[parsed.emissiveTextureIndex];
      if (glTFTex) mat.emissiveMap = textures[glTFTex.imageIndex] ?? null;
    }
    if (parsed.occlusionTextureIndex !== null) {
      const glTFTex = doc.textures[parsed.occlusionTextureIndex];
      if (glTFTex) mat.occlusionMap = textures[glTFTex.imageIndex] ?? null;
    }
    mat.occlusionStrength = parsed.occlusionStrength;
    mat.alphaMode = parsed.alphaMode === "MASK" ? "MASK" : "OPAQUE";
    mat.alphaCutoff = parsed.alphaCutoff;
    mat.doubleSided = parsed.doubleSided;
    mat.unlit = parsed.unlit;

    // KHR_texture_transform → mat3
    if (parsed.texTransform) {
      const t = parsed.texTransform;
      const c = Math.cos(t.rotation);
      const s = Math.sin(t.rotation);
      // Column-major 3x3: rotation+scale then offset
      mat.texTransform = new Float32Array([
        c * t.scale[0],  s * t.scale[0], 0,
        -s * t.scale[1], c * t.scale[1], 0,
        t.offset[0],     t.offset[1],    1,
      ]);
    }

    // hasTangent is set later by MeshRenderer.setup() when it detects the tangent VBO
    return mat;
  }

  #buildMesh(parsedMesh: ParsedMesh, materials: Material[]): GPUMesh {
    return {
      name: parsedMesh.name,
      primitives: parsedMesh.primitives.map((prim) => {
        const vertexCount = prim.position.length / 3;

        const mesh: Mesh = {
          vertex: {
            position: prim.position,
            normal: prim.normal ?? new Float32Array(vertexCount * 3),
            texcoord: prim.texcoord ?? new Float32Array(vertexCount * 2),
            ...(prim.tangent ? { tangent: prim.tangent } : {}),
          },
          index:
            prim.indices ?? this.#generateSequentialIndices(vertexCount),
        };

        const material =
          prim.materialIndex !== null &&
          prim.materialIndex < materials.length
            ? materials[prim.materialIndex]
            : new Material();

        return {
          mesh,
          material,
          skinData: prim.skinData ?? null,  // NEW: pass through skin vertex data
        };
      }),
    };
  }

  #generateSequentialIndices(vertexCount: number): Uint16Array | Uint32Array {
    if (vertexCount > 65535) {
      const indices = new Uint32Array(vertexCount);
      for (let i = 0; i < vertexCount; i++) indices[i] = i;
      return indices;
    }
    const indices = new Uint16Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) indices[i] = i;
    return indices;
  }
}
