import { loadProgram, loadShader } from "@/utils/gl";
import type { ShadowPassOptions, LightingPassOptions } from "../RendererBackend";
import type { RendererBackend } from "../RendererBackend";
import type { RenderPassDescriptor } from "../RenderPass";
import WebGL2Buffer from "./WebGL2Buffer";
import WebGL2Program from "./WebGL2Program";
import WebGL2RenderTarget from "./WebGL2RenderTarget";
import WebGL2Sampler from "./WebGL2Sampler";
import WebGL2Texture from "./WebGL2Texture";
import WebGL2VertexArray from "./WebGL2VertexArray";

export default class WebGL2Renderer implements RendererBackend {
  readonly type = "webgl2" as const;
  readonly capabilities = { supportsCompute: false } as const;
  #gl: WebGL2RenderingContext | null = null;
  #dw = 0;
  #dh = 0;
  #supportsFloatBlend = false;
  #lastError: { name: string; tag?: string; time: number } | null = null;
  #shadowSize = 0;
  #shadowFbo: WebGLFramebuffer | null = null;
  #shadowTex: WebGLTexture | null = null;
  #savedViewport: Int32Array | null = null;

  // G-Buffer resources (previously stored on Application)
  #gBufferFbo: WebGLFramebuffer | null = null;
  #gPositionMetallic: WebGLTexture | null = null;
  #gNormalRoughness: WebGLTexture | null = null;
  #gAlbedo: WebGLTexture | null = null;
  #gEmissive: WebGLTexture | null = null;
  #depthTexture: WebGLTexture | null = null;
  #gbufferRT: WebGL2RenderTarget | null = null;

  // Lighting RT resources (previously stored on Application)
  #lightingColor: WebGLTexture | null = null;
  #lightingRT: WebGL2RenderTarget | null = null;

  // Bloom RT resources (half-res ping-pong)
  #bloomColorA: WebGLTexture | null = null;
  #bloomColorB: WebGLTexture | null = null;
  #bloomFboA: WebGLFramebuffer | null = null;
  #bloomFboB: WebGLFramebuffer | null = null;
  #bloomRtA: WebGL2RenderTarget | null = null;
  #bloomRtB: WebGL2RenderTarget | null = null;
  #bloomW = 0;
  #bloomH = 0;

  async init(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { alpha: false }) as WebGL2RenderingContext | null;
    if (!gl) {
      console.error("Cannot use WebGL2");
      return;
    }

    this.#gl = gl;
    (globalThis as any).__dalpeng_last_gl = gl;

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.blendFunc(gl.ONE, gl.ONE);

    if (!gl.getExtension("EXT_color_buffer_float")) {
      console.error("FLOAT color buffer not available");
      document.body.innerHTML =
        "This requires EXT_color_buffer_float which is unavailable on this system.";
    }
    // Optional: blending to float render targets
    this.#supportsFloatBlend = !!gl.getExtension("EXT_float_blend");

    // Build G-Buffer attachments
    this.#gBufferFbo = gl.createFramebuffer();
    this.#allocateGBuffer(gl.drawingBufferWidth, gl.drawingBufferHeight);

    // Input hookup remains in app; this class focuses on graphics.
  }

  isReady() {
    return this.#gl !== null;
  }

  async createProgram(vertexSource: string, fragmentSource: string) {
    const gl = this.#gl!;
    const vs = loadShader(gl, gl.VERTEX_SHADER, vertexSource)!;
    const fs = loadShader(gl, gl.FRAGMENT_SHADER, fragmentSource)!;
    const prog = loadProgram(gl, vs, fs)!;
    return new WebGL2Program(gl, prog);
  }

  beginGeometryPass() {
    const rt: WebGL2RenderTarget | null = this.#gbufferRT;
    this.beginPass?.({
      target: rt ?? "default",
      depthWrite: true,
      blend: { enable: false },
      clearColor: [0, 0, 0, 0],
      clearDepth: 1,
      colorAttachments: rt ? [0, 1, 2, 3] : undefined,
    });
  }
  endGeometryPass() {
    this.endPass?.();
  }

  beginLightingPass(opts: LightingPassOptions) {
    const usePost = opts.postToneMapping;
    const gl = this.#gl!;
    if (usePost && !this.#lightingRT) {
      // lazy-allocate lighting RT (prefer RGBA16F if float blending is supported)
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      const color = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, color);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      const internalFormat = this.#supportsFloatBlend ? gl.RGBA16F : gl.RGBA8;
      if (!this.#supportsFloatBlend) {
        // eslint-disable-next-line no-console
        console.warn(
          "EXT_float_blend not available; lighting RT uses RGBA8 (LDR). Tone mapping runs but HDR is disabled."
        );
      }
      gl.texStorage2D(
        gl.TEXTURE_2D,
        1,
        internalFormat,
        gl.drawingBufferWidth,
        gl.drawingBufferHeight
      );
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
      this.#lightingColor = color;
      this.#lightingRT = new WebGL2RenderTarget(
        gl,
        fbo,
        gl.drawingBufferWidth,
        gl.drawingBufferHeight
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    // Re-attach color texture if it was detached in endLightingPass
    if (usePost) {
      const rt = this.#lightingRT!;
      const fbo = rt.fbo;
      const color = this.#lightingColor!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    const target = usePost ? this.#lightingRT! : "default";
    this.beginPass?.({
      target,
      depthWrite: false,
      blend: { enable: true, mode: "additive" },
      clearColor: [0, 0, 0, 0],
      clearDepth: 1,
      colorAttachments: usePost ? [0] : undefined,
    });

    // Bind G-Buffer textures to units 0..3 for lighting shader
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#gPositionMetallic ?? null);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#gNormalRoughness ?? null);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.#gAlbedo ?? null);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.#gEmissive ?? null);
  }
  endLightingPass() {
    const gl = this.#gl!;
    // Detach the color target from lighting FBO to avoid any driver feedback detection
    if (this.#lightingRT) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.#lightingRT.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // Shadow (depth-only) pass --------------------------------------------------
  beginShadowPass(size: number, opts?: ShadowPassOptions) {
    const gl = this.#gl!;
    // Lazy allocate or reallocate on size change
    if (!this.#shadowFbo || this.#shadowSize !== size) {
      // Destroy old resources
      if (this.#shadowTex) gl.deleteTexture(this.#shadowTex);
      if (this.#shadowFbo) gl.deleteFramebuffer(this.#shadowFbo);

      const fbo = gl.createFramebuffer()!;
      const depthTex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, depthTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, size, size);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.NONE);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);
      gl.drawBuffers([gl.NONE]);

      this.#shadowFbo = fbo;
      this.#shadowTex = depthTex;
      this.#shadowSize = size;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // Save current viewport and bind shadow target
    this.#savedViewport = gl.getParameter(gl.VIEWPORT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#shadowFbo);
    gl.viewport(0, 0, this.#shadowSize, this.#shadowSize);
    // Polygon offset reduces shadow acne
    const factor = opts?.offsetFactor ?? 1.1;
    const units = opts?.offsetUnits ?? 4.0;
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(factor, units);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.colorMask(false, false, false, false);
    gl.depthMask(true);
    gl.clearDepth(1);
    gl.clear(gl.DEPTH_BUFFER_BIT);
  }
  endShadowPass() {
    const gl = this.#gl!;
    // Restore color writes (default true)
    gl.colorMask(true, true, true, true);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    // Restore default culling
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    // Restore previous viewport if saved
    if (this.#savedViewport) {
      gl.viewport(
        this.#savedViewport[0],
        this.#savedViewport[1],
        this.#savedViewport[2],
        this.#savedViewport[3]
      );
      this.#savedViewport = null;
    }
  }

  bindShadowMap(unit: number) {
    const gl = this.#gl!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.#shadowTex);
  }

  hasShadowMap() {
    return this.#shadowTex !== null;
  }

  bindLightingTexture(unit: number) {
    const gl = this.#gl!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.#lightingColor);
  }

  hasLightingTexture() {
    return this.#lightingColor !== null;
  }

  // Particle forward pass (renders to lighting RT with alpha blending, depth read-only)
  beginParticlePass() {
    const gl = this.#gl!;
    if (!this.#lightingRT) return;
    const rt = this.#lightingRT;
    gl.bindFramebuffer(gl.FRAMEBUFFER, rt.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#lightingColor, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.depthMask(false);       // depth read-only
    gl.disable(gl.CULL_FACE);  // billboards are double-sided
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // premultiplied additive
  }
  endParticlePass() {
    const gl = this.#gl!;
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    // Detach lighting color to avoid feedback
    if (this.#lightingRT) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.#lightingRT.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // Bloom RT management -------------------------------------------------------
  allocateBloomResources() {
    const gl = this.#gl!;
    const w = Math.max(1, Math.floor(gl.drawingBufferWidth / 2));
    const h = Math.max(1, Math.floor(gl.drawingBufferHeight / 2));
    if (this.#bloomRtA && this.#bloomW === w && this.#bloomH === h) return;

    this.deallocateBloomResources();
    this.#bloomW = w;
    this.#bloomH = h;

    const createBloomRT = (): [WebGLFramebuffer, WebGLTexture, WebGL2RenderTarget] => {
      const fbo = gl.createFramebuffer()!;
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, w, h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return [fbo, tex, new WebGL2RenderTarget(gl, fbo, w, h)];
    };

    [this.#bloomFboA, this.#bloomColorA, this.#bloomRtA] = createBloomRT();
    [this.#bloomFboB, this.#bloomColorB, this.#bloomRtB] = createBloomRT();
  }

  deallocateBloomResources() {
    const gl = this.#gl;
    if (!gl) return;
    if (this.#bloomColorA) { gl.deleteTexture(this.#bloomColorA); this.#bloomColorA = null; }
    if (this.#bloomColorB) { gl.deleteTexture(this.#bloomColorB); this.#bloomColorB = null; }
    if (this.#bloomFboA) { gl.deleteFramebuffer(this.#bloomFboA); this.#bloomFboA = null; }
    if (this.#bloomFboB) { gl.deleteFramebuffer(this.#bloomFboB); this.#bloomFboB = null; }
    this.#bloomRtA = null;
    this.#bloomRtB = null;
    this.#bloomW = 0;
    this.#bloomH = 0;
  }

  /** Bright extract pass: renders to bloom RT A at half-res */
  beginBloomBrightPass() {
    this.allocateBloomResources();
    this.beginPass?.({
      target: this.#bloomRtA!,
      depthWrite: false,
      blend: { enable: false },
      clearColor: [0, 0, 0, 0],
      viewport: { x: 0, y: 0, w: this.#bloomW, h: this.#bloomH },
      colorAttachments: [0],
    });
  }

  /** Blur pass: ping-pong between bloom RT A and B */
  beginBloomBlurPass(horizontal: boolean) {
    const gl = this.#gl!;
    // Read from A → write to B (horizontal), then B → A (vertical)
    const target = horizontal ? this.#bloomRtB! : this.#bloomRtA!;
    const source = horizontal ? this.#bloomColorA! : this.#bloomColorB!;
    this.beginPass?.({
      target,
      depthWrite: false,
      blend: { enable: false },
      viewport: { x: 0, y: 0, w: this.#bloomW, h: this.#bloomH },
      colorAttachments: [0],
    });
    // Bind source texture at unit 5 for blur shader
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, source);
  }

  endBloomPass() {
    this.endPass?.();
  }

  /** Bind the final bloom result texture (RT A after vertical blur) */
  bindBloomTexture(unit: number) {
    const gl = this.#gl!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.#bloomColorA);
  }

  hasBloomTexture() {
    return this.#bloomColorA !== null;
  }

  getBloomSize(): [number, number] {
    return [this.#bloomW, this.#bloomH];
  }

  resize() {
    const gl = this.#gl!;
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    if (w === this.#dw && h === this.#dh) return;
    this.#allocateGBuffer(w, h);

    // If a lighting RT exists, drop it so it can be recreated with new size lazily
    if (this.#lightingRT) {
      if (this.#lightingColor) {
        gl.deleteTexture(this.#lightingColor);
        this.#lightingColor = null;
      }
      gl.deleteFramebuffer(this.#lightingRT.fbo);
      this.#lightingRT = null;
    }

    // Drop bloom RTs so they can be recreated at new half-res
    this.deallocateBloomResources();
  }

  #allocateGBuffer(width: number, height: number) {
    const gl = this.#gl!;
    this.#dw = width;
    this.#dh = height;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#gBufferFbo!);

    // delete existing textures if any
    if (this.#gPositionMetallic) gl.deleteTexture(this.#gPositionMetallic);
    if (this.#gNormalRoughness) gl.deleteTexture(this.#gNormalRoughness);
    if (this.#gAlbedo) gl.deleteTexture(this.#gAlbedo);
    if (this.#gEmissive) gl.deleteTexture(this.#gEmissive);
    if (this.#depthTexture) gl.deleteTexture(this.#depthTexture);

    this.#gPositionMetallic = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.#gPositionMetallic!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.#gPositionMetallic!,
      0
    );

    this.#gNormalRoughness = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.#gNormalRoughness!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT1,
      gl.TEXTURE_2D,
      this.#gNormalRoughness!,
      0
    );

    this.#gAlbedo = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.#gAlbedo!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT2,
      gl.TEXTURE_2D,
      this.#gAlbedo!,
      0
    );

    this.#gEmissive = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.#gEmissive!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT3,
      gl.TEXTURE_2D,
      this.#gEmissive!,
      0
    );

    const depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT16, width, height);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
    this.#depthTexture = depthTexture;

    gl.drawBuffers([
      gl.COLOR_ATTACHMENT0,
      gl.COLOR_ATTACHMENT1,
      gl.COLOR_ATTACHMENT2,
      gl.COLOR_ATTACHMENT3,
    ]);
    this.#gbufferRT = new WebGL2RenderTarget(gl, this.#gBufferFbo!, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  createBuffer(kind: "vertex" | "index") {
    return new WebGL2Buffer(this.#gl!, kind);
  }

  createVertexArray() {
    return new WebGL2VertexArray(this.#gl!);
  }

  // Optional resources (M1 abstraction surface)
  createTexture(desc: import("../Texture").TextureDescriptor2D) {
    return new WebGL2Texture(this.#gl!, desc);
  }
  createSampler(desc?: import("../Sampler").SamplerDescriptor) {
    return new WebGL2Sampler(desc);
  }

  drawIndexed(
    vao: WebGL2VertexArray,
    opts: { count: number; type?: "uint16" | "uint32"; mode?: "triangles" | "lines" }
  ) {
    const gl = this.#gl!;
    vao.bind();
    const typeEnum = opts.type === "uint32" ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    const modeEnum = opts.mode === "lines" ? gl.LINES : gl.TRIANGLES;
    gl.drawElements(modeEnum, opts.count, typeEnum, 0);
    vao.unbind();
  }

  drawArrays(
    vao: WebGL2VertexArray,
    opts: { mode: "triangle-strip" | "triangles" | "lines"; first?: number; count: number }
  ) {
    const gl = this.#gl!;
    vao.bind();
    const modeEnum =
      opts.mode === "triangle-strip"
        ? gl.TRIANGLE_STRIP
        : opts.mode === "lines"
          ? gl.LINES
          : gl.TRIANGLES;
    gl.drawArrays(modeEnum, opts.first ?? 0, opts.count);
    vao.unbind();
  }

  drawArraysInstanced(
    vao: import("../VertexArray").default,
    opts: { mode: "triangle-strip" | "triangles"; count: number; instanceCount: number }
  ) {
    const gl = this.#gl!;
    const va = vao as WebGL2VertexArray;
    va.bind();
    const modeEnum = opts.mode === "triangle-strip" ? gl.TRIANGLE_STRIP : gl.TRIANGLES;
    gl.drawArraysInstanced(modeEnum, 0, opts.count, opts.instanceCount);
    va.unbind();
  }

  setViewport(x: number, y: number, w: number, h: number) {
    this.#gl!.viewport(x, y, w, h);
  }

  getDrawableSize() {
    const c = this.#gl!.canvas as HTMLCanvasElement;
    return { width: c.width, height: c.height };
  }

  // Optional: generic pass API (supports default framebuffer and internal RenderTarget)
  beginPass(desc: RenderPassDescriptor) {
    const gl = this.#gl!;
    if (desc.target && desc.target !== "default") {
      const rt = desc.target as WebGL2RenderTarget;
      gl.bindFramebuffer(gl.FRAMEBUFFER, rt.fbo);
      if (desc.colorAttachments && desc.colorAttachments.length > 0) {
        const base = gl.COLOR_ATTACHMENT0;
        const bufs = desc.colorAttachments.map((i) => (base + i) as number);
        gl.drawBuffers(bufs as unknown as GLenum[]);
      }
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    if (desc.viewport) {
      gl.viewport(desc.viewport.x, desc.viewport.y, desc.viewport.w, desc.viewport.h);
    }

    if (typeof desc.depthWrite === "boolean") gl.depthMask(!!desc.depthWrite);

    if (desc.blend?.enable) {
      gl.enable(gl.BLEND);
      const mode = desc.blend.mode ?? "additive";
      if (mode === "alpha") {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      } else {
        gl.blendFunc(gl.ONE, gl.ONE);
      }
    } else {
      gl.disable(gl.BLEND);
    }

    let clearBits = 0;
    if (desc.clearColor) {
      gl.clearColor(desc.clearColor[0], desc.clearColor[1], desc.clearColor[2], desc.clearColor[3]);
      clearBits |= gl.COLOR_BUFFER_BIT;
    }
    if (typeof desc.clearDepth === "number") {
      gl.clearDepth(desc.clearDepth);
      clearBits |= gl.DEPTH_BUFFER_BIT;
    }
    if (clearBits) gl.clear(clearBits);
  }
  endPass() {
    // No-op for default framebuffer; state is left as configured by beginPass
  }

  debugCollectState() {
    const gl = this.#gl!;
    const cap = {
      extColorBufferFloat: !!gl.getExtension("EXT_color_buffer_float"),
      extFloatBlend: this.#supportsFloatBlend,
    };

    // Framebuffer bindings
    const fb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    const rfb = gl.getParameter((gl as any).READ_FRAMEBUFFER_BINDING ?? gl.FRAMEBUFFER_BINDING);
    const dfb = gl.getParameter((gl as any).DRAW_FRAMEBUFFER_BINDING ?? gl.FRAMEBUFFER_BINDING);

    // Draw buffers on current framebuffer
    const maxDB: number = gl.getParameter(gl.MAX_DRAW_BUFFERS) as number;
    const drawBuffers: number[] = [];
    for (let i = 0; i < Math.min(8, maxDB); i++) {
      const val = gl.getParameter((gl as any)[`DRAW_BUFFER${i}`]);
      drawBuffers.push(val);
    }

    // Active textures 0..7
    const activeTex = gl.getParameter(gl.ACTIVE_TEXTURE);
    const tex2D: (WebGLTexture | null)[] = [];
    for (let i = 0; i < 8; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      tex2D.push(gl.getParameter(gl.TEXTURE_BINDING_2D));
    }
    gl.activeTexture(activeTex);

    // Program, VAO, buffers
    const prog = gl.getParameter(gl.CURRENT_PROGRAM);
    const vao = gl.getParameter((gl as any).VERTEX_ARRAY_BINDING ?? null);
    const arrBuf = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
    const idxBuf = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);

    // States
    const blend = gl.isEnabled(gl.BLEND);
    const depthTest = gl.isEnabled(gl.DEPTH_TEST);
    const cull = gl.isEnabled(gl.CULL_FACE);
    const viewport = gl.getParameter(gl.VIEWPORT);
    const depthMask = gl.getParameter(gl.DEPTH_WRITEMASK);
    const colorMask = gl.getParameter(gl.COLOR_WRITEMASK);

    // Attached textures on current FBO (first 4)
    const attachments: any[] = [];
    if (fb) {
      for (let i = 0; i < 4; i++) {
        try {
          const attEnum = (gl as any)[`COLOR_ATTACHMENT${i}`];
          const obj = gl.getFramebufferAttachmentParameter(
            gl.FRAMEBUFFER,
            attEnum,
            gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME
          );
          attachments.push(obj);
        } catch {
          attachments.push(null);
        }
      }
    }

    // Known RTs completeness
    const savedFB = fb;
    const rtInfo: any = {};
    const collectFBO = (name: string, fbo: WebGLFramebuffer | null) => {
      if (!fbo) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      rtInfo[name] = status;
    };
    const fboShadow = this.#shadowFbo ?? undefined;
    if (this.#gbufferRT) collectFBO("gbuffer", this.#gbufferRT.fbo);
    if (this.#lightingRT) collectFBO("lighting", this.#lightingRT.fbo);
    if (fboShadow) collectFBO("shadow", fboShadow);
    gl.bindFramebuffer(gl.FRAMEBUFFER, savedFB);

    return {
      caps: cap,
      fb,
      readFB: rfb,
      drawFB: dfb,
      drawBuffers,
      tex2D0: tex2D[0],
      tex2D1: tex2D[1],
      tex2D2: tex2D[2],
      tex2D3: tex2D[3],
      tex2D4: tex2D[4],
      program: prog,
      vao,
      arrBuf,
      idxBuf,
      blend,
      depthTest,
      cull,
      depthMask,
      colorMask,
      viewport,
      attachments,
      rtStatus: rtInfo,
    };
  }

  debugDumpState(tag = "") {
    // eslint-disable-next-line no-console
    console.debug("[WebGL2Renderer.debugDumpState]", tag, this.debugCollectState());
  }

  debugCheckError(tag = "") {
    const gl = this.#gl!;
    const err = gl.getError();
    if (err !== gl.NO_ERROR) {
      let name = "UNKNOWN";
      if (err === gl.INVALID_ENUM) name = "INVALID_ENUM";
      else if (err === gl.INVALID_VALUE) name = "INVALID_VALUE";
      else if (err === gl.INVALID_OPERATION) name = "INVALID_OPERATION";
      else if (err === gl.INVALID_FRAMEBUFFER_OPERATION) name = "INVALID_FRAMEBUFFER_OPERATION";
      else if (err === gl.OUT_OF_MEMORY) name = "OUT_OF_MEMORY";
      this.#lastError = { name, tag, time: performance.now() };
      // eslint-disable-next-line no-console
      console.error(`[WebGL2Renderer] GL_ERROR ${name}`, tag);
    }
  }

  debugGetCaps() {
    return { extFloatBlend: this.#supportsFloatBlend };
  }
  debugGetLastError() {
    return this.#lastError;
  }
}
