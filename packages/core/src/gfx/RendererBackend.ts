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
  createProgram(vertexSource: string, fragmentSource: string): Promise<import("./Program").default>;

  // Frame-pass control (keep narrow for easy swapping).
  beginGeometryPass(app: any): void;
  endGeometryPass(app: any): void;

  beginLightingPass(app: any): void;
  endLightingPass(app: any): void;

  // Resource creation (minimal, for decoupling Components from WebGL)
  createBuffer(kind: "vertex" | "index"): import("./Buffer").default;
  createVertexArray(): import("./VertexArray").default;

  // Optional resource creation for textures/samplers
  createTexture?: (desc: import("./Texture").TextureDescriptor2D) => import("./Texture").default;
  createSampler?: (desc?: import("./Sampler").SamplerDescriptor) => import("./Sampler").default;

  // Draw helpers (keeps Components free of GL enums)
  drawIndexed(
    vao: import("./VertexArray").default,
    opts: { count: number; type?: "uint16" | "uint32"; mode?: "triangles" | "lines" }
  ): void;
  drawArrays(
    vao: import("./VertexArray").default,
    opts: { mode: "triangle-strip" | "triangles" | "lines"; first?: number; count: number }
  ): void;

  // Misc per-frame state
  setViewport(app: any, x: number, y: number, w: number, h: number): void;

  // Surface/canvas info helpers
  getDrawableSize(app: any): { width: number; height: number };

  // Handle canvas resize (reallocate framebuffers/textures, etc.)
  resize(app: any): void;

  // Optional generic pass API
  beginPass?: (app: any, desc: import("./RenderPass").RenderPassDescriptor) => void;
  endPass?: (app: any) => void;
}
