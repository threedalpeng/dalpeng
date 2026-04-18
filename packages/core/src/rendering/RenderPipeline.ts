import type Application from "../Application";
import { FrameProfiler } from "../debug";
import type { RendererBackend } from "../gfx/RendererBackend";
import { dummyQuadForLight } from "../utils/mesh";
import FrameResources from "./FrameResources";
import IBLPrecompute from "./IBLPrecompute";
import BloomPass from "./passes/BloomPass";
import FxaaPass from "./passes/FxaaPass";
import GeometryPass from "./passes/GeometryPass";
import LightingPass from "./passes/LightingPass";
import ParticlePass from "./passes/ParticlePass";
import PipelineShaders from "./passes/PipelineShaders";
import PixelArtBlitPass from "./passes/PixelArtBlitPass";
import PixelArtSetupPass from "./passes/PixelArtSetupPass";
import PostComposePass from "./passes/PostComposePass";
import type {
  PipelineIntrospection,
  RenderFrameContext,
  RenderInitContext,
  RenderPass,
  SharedRenderResources,
} from "./passes/RenderPass";
import ShadowPass from "./passes/ShadowPass";
import SkyboxPass from "./passes/SkyboxPass";
import Sprite2DPass from "./passes/Sprite2DPass";
import SsaoPass from "./passes/SsaoPass";
import TilemapPass from "./passes/TilemapPass";

import blitfrag from "../shaders/blit.frag?raw";
import blitvert from "../shaders/blit.vert?raw";
import fxaafrag from "../shaders/fxaa.frag?raw";
import gbuffrag from "../shaders/g_buf.frag?raw";
import gbufvert from "../shaders/g_buf.vert?raw";
import mainfrag from "../shaders/main.frag?raw";
import mainvert from "../shaders/main.vert?raw";
import skyboxfrag from "../shaders/skybox.frag?raw";
import skyboxvert from "../shaders/skybox.vert?raw";
import sprite2dfrag from "../shaders/sprite2d.frag?raw";
import sprite2dvert from "../shaders/sprite2d.vert?raw";
import ssaofrag from "../shaders/ssao.frag?raw";
import ssaoblurfrag from "../shaders/ssao_blur.frag?raw";

export default class RenderPipeline implements PipelineIntrospection {
  /**
   * Public shader surface (back-compat with component renderers that access
   * `app.pipeline.shader.geometry/shadow/lighting`). Internally this is the
   * same `PipelineShaders` instance passed to every pass.
   */
  readonly shader: PipelineShaders = new PipelineShaders();

  /**
   * Back-compat: Light.renderLight() draws a fullscreen quad per light and
   * fetches the VAO from here via `app.lightingQuad`.
   */
  get lightingQuad() {
    return this.#shared?.fullscreenQuad;
  }

  #frameResources = new FrameResources();
  #iblPrecompute = new IBLPrecompute();
  #iblPending = false;
  #shared: SharedRenderResources | null = null;
  #renderer: RendererBackend | null = null;

  /** Ordered pass list. Default order mirrors historical RenderPipeline.render(). */
  #passes: RenderPass[] = [
    new ShadowPass(),
    new GeometryPass(),
    new SsaoPass(),
    new LightingPass(),
    new SkyboxPass(),
    new PixelArtSetupPass(),
    new TilemapPass(),
    new Sprite2DPass(),
    new PixelArtBlitPass(),
    new ParticlePass(),
    new BloomPass(),
    new PostComposePass(),
    new FxaaPass(),
  ];

  async init(renderer: RendererBackend): Promise<void> {
    this.#renderer = renderer;

    for (const s of Object.values(this.shader)) {
      s.bindBackend(renderer);
    }

    // Core shaders — renderers reference these externally.
    await Promise.allSettled([
      this.shader.geometry.loadFrom(gbufvert, gbuffrag),
      this.shader.lighting.loadFrom(mainvert, mainfrag),
      this.shader.post.loadFrom(mainvert, (await import("../shaders/post.frag?raw")).default),
      this.shader.shadow.loadFrom(
        (await import("../shaders/shadow.vert?raw")).default,
        (await import("../shaders/shadow.frag?raw")).default
      ),
    ]);

    await Promise.allSettled([
      this.shader.bloomBright.loadFrom(
        mainvert,
        (await import("../shaders/bloom_bright.frag?raw")).default
      ),
      this.shader.bloomBlur.loadFrom(
        mainvert,
        (await import("../shaders/bloom_blur.frag?raw")).default
      ),
      this.shader.particle.loadFrom(
        (await import("../shaders/particle.vert?raw")).default,
        (await import("../shaders/particle.frag?raw")).default
      ),
      this.shader.ssao.loadFrom(mainvert, ssaofrag),
      this.shader.ssaoBlur.loadFrom(mainvert, ssaoblurfrag),
      this.shader.skybox.loadFrom(skyboxvert, skyboxfrag),
      this.shader.fxaa.loadFrom(mainvert, fxaafrag),
      this.shader.sprite2d.loadFrom(sprite2dvert, sprite2dfrag),
      this.shader.blit.loadFrom(blitvert, blitfrag),
    ]);

    this.#shared = {
      fullscreenQuad: this.#createFullscreenQuad(renderer),
      iblPrecompute: this.#iblPrecompute,
    };

    await Promise.all(
      this.#passes.map((pass) => pass.init?.(this.#makeInitContext(renderer)))
    );
  }

  async initIBL(renderer: RendererBackend, hdrUrl: string): Promise<void> {
    await this.#iblPrecompute.precompute(renderer, hdrUrl);
  }

  render(app: Application): void {
    const renderer = app.renderer;
    const features = app.features;
    const resources = this.#frameResources;

    const { width, height } = renderer.getDrawableSize();
    resources.ensureSize(renderer, width, height);
    renderer.setViewport(0, 0, width, height);

    if (features.ibl && features.iblHdrUrl && !this.#iblPrecompute.resources && !this.#iblPending) {
      this.#iblPending = true;
      this.initIBL(renderer, features.iblHdrUrl).then(() => {
        this.#iblPending = false;
      });
    }

    if (!this.#shared) return; // init() not awaited yet

    const ctx: RenderFrameContext = {
      app,
      renderer,
      resources,
      features,
      shaders: this.shader,
      shared: this.#shared,
      pipeline: this,
    };

    for (const pass of this.#passes) {
      if (pass.shouldRun && !pass.shouldRun(ctx)) continue;
      FrameProfiler.beginPass(pass.name);
      pass.execute(ctx);
      FrameProfiler.endPass();
    }
  }

  dispose(): void {
    for (const pass of this.#passes) {
      try {
        pass.dispose?.();
      } catch (err) {
        console.error(`[RenderPipeline] ${pass.name}.dispose() threw:`, err);
      }
    }
    this.#shared = null;
    this.#renderer = null;
  }

  // ──────────────────────────────────────────────────────────────
  // Pass scheduling / introspection API
  // ──────────────────────────────────────────────────────────────

  get passes(): readonly RenderPass[] {
    return this.#passes;
  }

  getPass<T extends RenderPass = RenderPass>(name: string): T | null {
    return (this.#passes.find((p) => p.name === name) as T | undefined) ?? null;
  }

  async insertAfter(name: string, pass: RenderPass): Promise<void> {
    this.#assertUniqueName(pass.name);
    const idx = this.#passes.findIndex((p) => p.name === name);
    if (idx < 0) throw new Error(`[RenderPipeline] no pass named "${name}"`);
    this.#passes.splice(idx + 1, 0, pass);
    await this.#lateInit(pass);
  }

  async insertBefore(name: string, pass: RenderPass): Promise<void> {
    this.#assertUniqueName(pass.name);
    const idx = this.#passes.findIndex((p) => p.name === name);
    if (idx < 0) throw new Error(`[RenderPipeline] no pass named "${name}"`);
    this.#passes.splice(idx, 0, pass);
    await this.#lateInit(pass);
  }

  removePass(name: string): RenderPass | null {
    const idx = this.#passes.findIndex((p) => p.name === name);
    if (idx < 0) return null;
    const [removed] = this.#passes.splice(idx, 1);
    try {
      removed.dispose?.();
    } catch (err) {
      console.error(`[RenderPipeline] ${removed.name}.dispose() threw:`, err);
    }
    return removed;
  }

  // ──────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────

  #assertUniqueName(name: string): void {
    if (this.#passes.some((p) => p.name === name)) {
      throw new Error(`[RenderPipeline] pass named "${name}" already registered`);
    }
  }

  async #lateInit(pass: RenderPass): Promise<void> {
    // Pipeline not initialized yet — init() will pick the pass up in its loop.
    if (!this.#shared || !this.#renderer) return;
    await pass.init?.(this.#makeInitContext(this.#renderer));
  }

  #makeInitContext(renderer: RendererBackend): RenderInitContext {
    if (!this.#shared) {
      throw new Error("[RenderPipeline] shared resources not initialized");
    }
    return {
      renderer,
      shaders: this.shader,
      shared: this.#shared,
      pipeline: this,
    };
  }

  #createFullscreenQuad(renderer: RendererBackend) {
    // Shared by every pass that draws a fullscreen triangle-strip with
    // `main.vert` / `skybox.vert` (both use `layout(location=0) in vec3 aPosition`).
    // Vertex order: top-left, bottom-left, top-right, bottom-right.
    const vao = renderer.createVertexArray();
    const vbo = renderer.createBuffer("vertex");
    vbo.update(dummyQuadForLight());
    vao.setVertexBuffer(0, vbo, 3);
    return vao;
  }
}
