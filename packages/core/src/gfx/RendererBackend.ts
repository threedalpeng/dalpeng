import type GfxBuffer from "./Buffer";
import type Program from "./Program";
import type { RenderPassDescriptor } from "./RenderPass";
import type { RenderTarget, RenderTargetDescriptor } from "./RenderTarget";
import type GfxSampler from "./Sampler";
import type { SamplerDescriptor } from "./Sampler";
import type GfxTexture from "./Texture";
import type { TextureDescriptor } from "./Texture";
import type GfxVertexArray from "./VertexArray";

export type BackendType = "webgl2" | "webgpu";

export interface BackendCapabilities {
  supportsCompute: boolean;
  supportsFloatBlend: boolean;
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

  // Resource creation
  createBuffer(kind: "vertex" | "index"): GfxBuffer;
  createVertexArray(): GfxVertexArray;

  // Resource creation for textures/samplers
  createTexture(desc: TextureDescriptor): GfxTexture;
  createSampler?: (desc?: SamplerDescriptor) => GfxSampler;

  // Render target (FBO) management
  createRenderTarget(desc: RenderTargetDescriptor): RenderTarget;
  destroyRenderTarget(rt: RenderTarget): void;

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

  // Per-draw-call state
  setCullFace?(enabled: boolean): void;
  setGenericIntegerAttrib?(location: number, x: number, y: number, z: number, w: number): void;

  // Unbind whatever 2D / cube texture is at `unit`. Passes that sample a
  // color buffer should call this before the next pass writes to the same
  // texture, otherwise WebGL flags a feedback loop (sampling and writing
  // the same texture simultaneously).
  unbindTextureAt?(unit: number): void;

  // Misc per-frame state
  setViewport(x: number, y: number, w: number, h: number): void;

  // Surface/canvas info helpers
  getDrawableSize(): { width: number; height: number };

  // Handle canvas resize (reallocate framebuffers/textures)
  resize(): void;

  // Generic pass API
  beginPass(desc: RenderPassDescriptor): void;
  endPass(): void;

  // Optional runtime debug helpers (backend-specific)
  debugDumpState?: (tag?: string) => void;
  debugCheckError?: (tag?: string) => void;
  debugCollectState?: () => unknown;
  debugGetCaps?: () => unknown;
  debugGetLastError?: () => unknown;
}
