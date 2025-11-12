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

export interface RendererBackend {
  readonly type: BackendType;
  readonly capabilities: BackendCapabilities;

  // Initialize graphics context and any per-app state.
  init(app: any, canvas: HTMLCanvasElement): Promise<void>;

  // Program creation (compilation/linking or pipeline construction)
  createProgram(vertexSource: string, fragmentSource: string): Promise<Program>;

  // Frame-pass control (keep narrow for easy swapping).
  beginGeometryPass(app: any): void;
  endGeometryPass(app: any): void;

  beginLightingPass(app: any): void;
  endLightingPass(app: any): void;

  // Resource creation (minimal, for decoupling Components from WebGL)
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

  // Misc per-frame state
  setViewport(app: any, x: number, y: number, w: number, h: number): void;

  // Surface/canvas info helpers
  getDrawableSize(app: any): { width: number; height: number };

  // Handle canvas resize (reallocate framebuffers/textures, etc.)
  resize(app: any): void;

  // Optional generic pass API
  beginPass?: (app: any, desc: RenderPassDescriptor) => void;
  endPass?: (app: any) => void;

  // Optional runtime debug helpers (backend-specific)
  debugDumpState?: (app: any, tag?: string) => void;
  debugCheckError?: (tag?: string) => void;
  debugCollectState?: (app: any) => unknown;
  debugGetCaps?: () => unknown;
  debugGetLastError?: () => unknown;
}
