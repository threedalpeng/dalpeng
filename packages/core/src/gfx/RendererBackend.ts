import type GfxBuffer from "./Buffer";
import type Program from "./Program";
import type { RenderPassDescriptor } from "./RenderPass";
import type GfxSampler from "./Sampler";
import type { SamplerDescriptor } from "./Sampler";
import type GfxTexture from "./Texture";
import type { TextureDescriptor2D } from "./Texture";
import type GfxVertexArray from "./VertexArray";

export type BackendType = "webgl2" | "webgpu";

export interface BackendCapabilities {
  supportsCompute: boolean;
}

export interface ShadowPassOptions {
  offsetFactor?: number;
  offsetUnits?: number;
}

export interface LightingPassOptions {
  postToneMapping: boolean;
}

export interface RendererBackend {
  readonly type: BackendType;
  readonly capabilities: BackendCapabilities;

  // Initialize graphics context. Renderer owns the canvas reference internally.
  init(canvas: HTMLCanvasElement): Promise<void>;

  // Whether the backend has a valid, ready context.
  isReady(): boolean;

  // Program creation (compilation/linking or pipeline construction)
  createProgram(vertexSource: string, fragmentSource: string): Promise<Program>;

  // Frame-pass control
  beginGeometryPass(): void;
  endGeometryPass(): void;

  beginLightingPass(opts: LightingPassOptions): void;
  endLightingPass(): void;

  // Optional shadow map pass (directional depth)
  beginShadowPass?: (size: number, opts?: ShadowPassOptions) => void;
  endShadowPass?: () => void;
  bindShadowMap?: (unit: number) => void;
  hasShadowMap?: () => boolean;

  // Expose lighting texture for post-processing
  bindLightingTexture?: (unit: number) => void;
  hasLightingTexture?: () => boolean;

  // Optional particle forward pass (after lighting, before post)
  beginParticlePass?: () => void;
  endParticlePass?: () => void;

  // Optional bloom pass resources
  allocateBloomResources?: () => void;
  deallocateBloomResources?: () => void;
  beginBloomBrightPass?: () => void;
  beginBloomBlurPass?: (horizontal: boolean) => void;
  endBloomPass?: () => void;
  bindBloomTexture?: (unit: number) => void;
  hasBloomTexture?: () => boolean;

  // Resource creation
  createBuffer(kind: "vertex" | "index"): GfxBuffer;
  createVertexArray(): GfxVertexArray;

  // Optional resource creation for textures/samplers
  createTexture?: (desc: TextureDescriptor2D) => GfxTexture;
  createSampler?: (desc?: SamplerDescriptor) => GfxSampler;

  // Draw helpers (keeps Components free of GL enums)
  drawIndexed(
    vao: GfxVertexArray,
    opts: { count: number; type?: "uint16" | "uint32"; mode?: "triangles" | "lines" }
  ): void;
  drawArrays(
    vao: GfxVertexArray,
    opts: { mode: "triangle-strip" | "triangles" | "lines"; first?: number; count: number }
  ): void;
  drawArraysInstanced?: (
    vao: GfxVertexArray,
    opts: { mode: "triangle-strip" | "triangles"; count: number; instanceCount: number }
  ) => void;

  // Misc per-frame state
  setViewport(x: number, y: number, w: number, h: number): void;

  // Surface/canvas info helpers
  getDrawableSize(): { width: number; height: number };

  // Handle canvas resize (reallocate framebuffers/textures)
  resize(): void;

  // Optional generic pass API
  beginPass?: (desc: RenderPassDescriptor) => void;
  endPass?: () => void;

  // Optional runtime debug helpers (backend-specific)
  debugDumpState?: (tag?: string) => void;
  debugCheckError?: (tag?: string) => void;
  debugCollectState?: () => unknown;
  debugGetCaps?: () => unknown;
  debugGetLastError?: () => unknown;
}
