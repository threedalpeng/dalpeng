import type { RendererBackend } from "../gfx/RendererBackend";
import type { RenderTarget } from "../gfx/RenderTarget";
import type GfxTexture from "../gfx/Texture";

export interface GBufferResources {
  readonly rt: RenderTarget;
  readonly positionMetallic: GfxTexture;
  readonly normalRoughness: GfxTexture;
  readonly albedo: GfxTexture;
  readonly emissive: GfxTexture;
  readonly depth: GfxTexture;
}

export interface LightingResources {
  readonly rt: RenderTarget;
  readonly color: GfxTexture;
}

export interface ShadowResources {
  readonly rt: RenderTarget;
  readonly depth: GfxTexture;
  readonly mapSize: number;
}

export interface SSAOResources {
  readonly rtRaw: RenderTarget;
  readonly rtBlurred: RenderTarget;
  readonly texRaw: GfxTexture;
  readonly texBlurred: GfxTexture;
}

export interface BloomResources {
  readonly rtA: RenderTarget;
  readonly rtB: RenderTarget;
  readonly texA: GfxTexture;
  readonly texB: GfxTexture;
  readonly width: number;
  readonly height: number;
}

export interface FxaaResources {
  readonly tex: GfxTexture;
  readonly rt: RenderTarget;
}

export interface PixelArtResources {
  readonly rt: RenderTarget;
  readonly color: GfxTexture;
  readonly width: number;
  readonly height: number;
}

export default class FrameResources {
  gbuffer: GBufferResources | null = null;
  lighting: LightingResources | null = null;
  shadow: ShadowResources | null = null;
  ssao: SSAOResources | null = null;
  bloom: BloomResources | null = null;
  fxaa: FxaaResources | null = null;
  pixelArt: PixelArtResources | null = null;

  #width = 0;
  #height = 0;

  ensureSize(backend: RendererBackend, width: number, height: number): void {
    if (this.gbuffer && this.#width === width && this.#height === height) return;
    this.#width = width;
    this.#height = height;

    if (this.gbuffer) {
      backend.destroyRenderTarget(this.gbuffer.rt);
      this.gbuffer.positionMetallic.dispose();
      this.gbuffer.normalRoughness.dispose();
      this.gbuffer.albedo.dispose();
      this.gbuffer.emissive.dispose();
      this.gbuffer.depth.dispose();
    }
    if (this.lighting) {
      backend.destroyRenderTarget(this.lighting.rt);
      this.lighting.color.dispose();
    }

    const positionMetallic = backend.createTexture({ kind: "2d", width, height, format: "rgba16f", samplerHint: "nearest" });
    const normalRoughness = backend.createTexture({ kind: "2d", width, height, format: "rgba16f", samplerHint: "nearest" });
    const albedo = backend.createTexture({ kind: "2d", width, height, format: "rgba16f", samplerHint: "nearest" });
    const emissive = backend.createTexture({ kind: "2d", width, height, format: "rgba16f", samplerHint: "nearest" });
    const depth = backend.createTexture({ kind: "2d", width, height, format: "depth16", samplerHint: "depth" });

    const gbufferRT = backend.createRenderTarget({
      width, height,
      colorAttachments: [positionMetallic, normalRoughness, albedo, emissive],
      depthAttachment: depth,
    });

    this.gbuffer = { rt: gbufferRT, positionMetallic, normalRoughness, albedo, emissive, depth };

    // Lighting RT shares G-Buffer depth for particle depth testing.
    const lightingFormat = backend.capabilities.supportsFloatBlend ? "rgba16f" as const : "rgba8unorm" as const;
    if (!backend.capabilities.supportsFloatBlend) {
      console.warn("EXT_float_blend not available; lighting RT uses RGBA8 (LDR).");
    }
    const lightingColor = backend.createTexture({ kind: "2d", width, height, format: lightingFormat, samplerHint: "nearest" });

    const lightingRT = backend.createRenderTarget({
      width, height,
      colorAttachments: [lightingColor],
      depthAttachment: depth,
    });

    this.lighting = { rt: lightingRT, color: lightingColor };

    if (this.ssao) {
      this.#disposeSSAO(backend);
    }
    if (this.bloom) {
      this.#disposeBloom(backend);
    }
    if (this.fxaa) {
      this.#disposeFxaa(backend);
    }
  }

  ensureShadow(backend: RendererBackend, mapSize: number): void {
    if (this.shadow && this.shadow.mapSize === mapSize) return;

    if (this.shadow) {
      backend.destroyRenderTarget(this.shadow.rt);
      this.shadow.depth.dispose();
    }

    const depth = backend.createTexture({ kind: "2d", width: mapSize, height: mapSize, format: "depth24unorm", samplerHint: "depth" });
    const rt = backend.createRenderTarget({
      width: mapSize, height: mapSize,
      depthAttachment: depth,
    });

    this.shadow = { rt, depth, mapSize };
  }

  ensureSSAO(backend: RendererBackend, width: number, height: number): void {
    if (this.ssao && this.ssao.texRaw.width === width && this.ssao.texRaw.height === height) return;

    if (this.ssao) this.#disposeSSAO(backend);

    const texRaw = backend.createTexture({ kind: "2d", width, height, format: "r16f", samplerHint: "nearest" });
    const texBlurred = backend.createTexture({ kind: "2d", width, height, format: "r16f", samplerHint: "nearest" });
    const rtRaw = backend.createRenderTarget({ width, height, colorAttachments: [texRaw] });
    const rtBlurred = backend.createRenderTarget({ width, height, colorAttachments: [texBlurred] });

    this.ssao = { rtRaw, rtBlurred, texRaw, texBlurred };
  }

  ensurePixelArt(backend: RendererBackend, gameWidth: number, gameHeight: number): void {
    if (this.pixelArt && this.pixelArt.width === gameWidth && this.pixelArt.height === gameHeight) return;

    if (this.pixelArt) {
      backend.destroyRenderTarget(this.pixelArt.rt);
      this.pixelArt.color.dispose();
    }

    const color = backend.createTexture({ kind: "2d", width: gameWidth, height: gameHeight, format: "rgba8unorm", samplerHint: "nearest" });
    const rt = backend.createRenderTarget({ width: gameWidth, height: gameHeight, colorAttachments: [color] });

    this.pixelArt = { rt, color, width: gameWidth, height: gameHeight };
  }

  ensureFxaa(backend: RendererBackend): void {
    const w = this.#width;
    const h = this.#height;
    if (this.fxaa && this.fxaa.tex.width === w && this.fxaa.tex.height === h) return;

    if (this.fxaa) this.#disposeFxaa(backend);

    const tex = backend.createTexture({ kind: "2d", width: w, height: h, format: "rgba8unorm", samplerHint: "linear" });
    const rt = backend.createRenderTarget({ width: w, height: h, colorAttachments: [tex] });

    this.fxaa = { tex, rt };
  }

  ensureBloom(backend: RendererBackend): void {
    const w = Math.max(1, Math.floor(this.#width / 2));
    const h = Math.max(1, Math.floor(this.#height / 2));
    if (this.bloom && this.bloom.width === w && this.bloom.height === h) return;

    if (this.bloom) this.#disposeBloom(backend);

    const texA = backend.createTexture({ kind: "2d", width: w, height: h, format: "rgba16f", samplerHint: "linear" });
    const texB = backend.createTexture({ kind: "2d", width: w, height: h, format: "rgba16f", samplerHint: "linear" });
    const rtA = backend.createRenderTarget({ width: w, height: h, colorAttachments: [texA] });
    const rtB = backend.createRenderTarget({ width: w, height: h, colorAttachments: [texB] });

    this.bloom = { rtA, rtB, texA, texB, width: w, height: h };
  }

  dispose(backend: RendererBackend): void {
    if (this.gbuffer) {
      backend.destroyRenderTarget(this.gbuffer.rt);
      this.gbuffer.positionMetallic.dispose();
      this.gbuffer.normalRoughness.dispose();
      this.gbuffer.albedo.dispose();
      this.gbuffer.emissive.dispose();
      this.gbuffer.depth.dispose();
      this.gbuffer = null;
    }
    if (this.lighting) {
      backend.destroyRenderTarget(this.lighting.rt);
      this.lighting.color.dispose();
      this.lighting = null;
    }
    if (this.shadow) {
      backend.destroyRenderTarget(this.shadow.rt);
      this.shadow.depth.dispose();
      this.shadow = null;
    }
    if (this.ssao) {
      this.#disposeSSAO(backend);
    }
    if (this.bloom) {
      this.#disposeBloom(backend);
    }
    if (this.fxaa) {
      this.#disposeFxaa(backend);
    }
    if (this.pixelArt) {
      backend.destroyRenderTarget(this.pixelArt.rt);
      this.pixelArt.color.dispose();
      this.pixelArt = null;
    }
  }

  #disposeSSAO(backend: RendererBackend): void {
    if (!this.ssao) return;
    backend.destroyRenderTarget(this.ssao.rtRaw);
    backend.destroyRenderTarget(this.ssao.rtBlurred);
    this.ssao.texRaw.dispose();
    this.ssao.texBlurred.dispose();
    this.ssao = null;
  }

  #disposeBloom(backend: RendererBackend): void {
    if (!this.bloom) return;
    backend.destroyRenderTarget(this.bloom.rtA);
    backend.destroyRenderTarget(this.bloom.rtB);
    this.bloom.texA.dispose();
    this.bloom.texB.dispose();
    this.bloom = null;
  }

  #disposeFxaa(backend: RendererBackend): void {
    if (!this.fxaa) return;
    backend.destroyRenderTarget(this.fxaa.rt);
    this.fxaa.tex.dispose();
    this.fxaa = null;
  }
}
