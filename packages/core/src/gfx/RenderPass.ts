export type BlendMode = "additive" | "alpha" | "premultiplied-additive";

export interface RenderPassViewport {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Library-neutral pass descriptor for simple cases.
// For now, only default framebuffer passes are supported in WebGL2Renderer.beginPass.
export interface RenderPassDescriptor {
  // Target selection: default backbuffer or an engine RenderTarget
  target?: "default" | import("./RenderTarget").RenderTarget;

  // Clears (optional)
  clearColor?: [number, number, number, number];
  clearDepth?: number;

  // State (optional)
  depthTest?: boolean;
  depthWrite?: boolean;
  blend?: { enable: boolean; mode?: BlendMode };
  viewport?: RenderPassViewport;

  // Optional: specify color attachment indices for MRT targets (WebGL2)
  // If omitted, backend keeps existing drawBuffers state.
  colorAttachments?: number[];

  // Color write mask — false disables all color writes (depth-only pass)
  colorWrite?: boolean;

  // Polygon offset for depth bias (shadow map rendering)
  polygonOffset?: { factor: number; units: number } | null;
}
