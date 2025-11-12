import type Application from "@/Application";
import { loadProgram, loadShader } from "@/utils/gl";
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

  async init(app: Application, canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { alpha: false }) as WebGL2RenderingContext | null;
    if (!gl) {
      console.error("Cannot use WebGL2");
      return;
    }

    // Attach to app for backward compatibility
    (app as any).context = gl;
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

    // Build G-Buffer attachments on app (preserve current fields/usage)
    (app as any).gBuffer = gl.createFramebuffer();
    this.#allocateGBuffer(app, gl.drawingBufferWidth, gl.drawingBufferHeight);

    // Input hookup remains in app; this class focuses on graphics.
  }

  async createProgram(vertexSource: string, fragmentSource: string) {
    const gl = this.#gl!;
    const vs = loadShader(gl, gl.VERTEX_SHADER, vertexSource)!;
    const fs = loadShader(gl, gl.FRAGMENT_SHADER, fragmentSource)!;
    const prog = loadProgram(gl, vs, fs)!;
    return new WebGL2Program(gl, prog);
  }

  beginGeometryPass(app: Application) {
    const rt: WebGL2RenderTarget | null = ((app as any).renderTargets?.gbuffer ??
      null) as WebGL2RenderTarget | null;
    this.beginPass?.(app, {
      target: rt ?? "default",
      depthWrite: true,
      blend: { enable: false },
      clearColor: [0, 0, 0, 0],
      clearDepth: 1,
      colorAttachments: rt ? [0, 1, 2, 3] : undefined,
    });
  }
  endGeometryPass(app: Application) {
    this.endPass?.(app);
  }

  beginLightingPass(app: Application) {
    const usePost = !!(app as any).features?.postToneMapping;
    const gl = this.#gl!;
    if (usePost && !(app as any).renderTargets?.lighting) {
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
      (app as any)._lightingColor = color;
      (app as any).renderTargets = (app as any).renderTargets || {};
      (app as any).renderTargets.lighting = new WebGL2RenderTarget(
        gl,
        fbo,
        gl.drawingBufferWidth,
        gl.drawingBufferHeight
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    // Re-attach color texture if it was detached in endLightingPass
    if (usePost) {
      const rt = (app as any).renderTargets.lighting as WebGL2RenderTarget;
      const fbo = rt.fbo;
      const color = (app as any)._lightingColor as WebGLTexture;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    const target = usePost
      ? ((app as any).renderTargets.lighting as WebGL2RenderTarget)
      : "default";
    this.beginPass?.(app, {
      target,
      depthWrite: false,
      blend: { enable: true, mode: "additive" },
      clearColor: [0, 0, 0, 0],
      clearDepth: 1,
      colorAttachments: usePost ? [0] : undefined,
    });

    // Bind G-Buffer textures to units 0..3 for lighting shader
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gPositionMetallic ?? null);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gNormalRoughness ?? null);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gAlbedo ?? null);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gEmissive ?? null);
  }
  endLightingPass(app: Application) {
    const gl = this.#gl!;
    // Detach the color target from lighting FBO to avoid any driver feedback detection
    const rt = (app as any).renderTargets?.lighting as WebGL2RenderTarget | null;
    if (rt) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, rt.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  resize(app: Application) {
    const gl = this.#gl!;
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    if (w === this.#dw && h === this.#dh) return;
    this.#allocateGBuffer(app, w, h);

    // If a lighting RT exists, drop it so it can be recreated with new size lazily
    const rtLighting = (app as any).renderTargets?.lighting as WebGL2RenderTarget | null;
    if (rtLighting) {
      if ((app as any)._lightingColor) {
        gl.deleteTexture((app as any)._lightingColor);
        (app as any)._lightingColor = null;
      }
      gl.deleteFramebuffer(rtLighting.fbo);
      (app as any).renderTargets.lighting = null;
    }
  }

  #allocateGBuffer(app: Application, width: number, height: number) {
    const gl = this.#gl!;
    this.#dw = width;
    this.#dh = height;

    gl.bindFramebuffer(gl.FRAMEBUFFER, (app as any).gBuffer!);

    // delete existing textures if any
    if ((app as any).gPositionMetallic) gl.deleteTexture((app as any).gPositionMetallic);
    if ((app as any).gNormalRoughness) gl.deleteTexture((app as any).gNormalRoughness);
    if ((app as any).gAlbedo) gl.deleteTexture((app as any).gAlbedo);
    if ((app as any).gEmissive) gl.deleteTexture((app as any).gEmissive);
    if ((app as any)._depthTexture) gl.deleteTexture((app as any)._depthTexture);

    (app as any).gPositionMetallic = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gPositionMetallic!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      (app as any).gPositionMetallic!,
      0
    );

    (app as any).gNormalRoughness = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gNormalRoughness!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT1,
      gl.TEXTURE_2D,
      (app as any).gNormalRoughness!,
      0
    );

    (app as any).gAlbedo = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gAlbedo!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT2,
      gl.TEXTURE_2D,
      (app as any).gAlbedo!,
      0
    );

    (app as any).gEmissive = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gEmissive!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT3,
      gl.TEXTURE_2D,
      (app as any).gEmissive!,
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
    (app as any)._depthTexture = depthTexture;

    gl.drawBuffers([
      gl.COLOR_ATTACHMENT0,
      gl.COLOR_ATTACHMENT1,
      gl.COLOR_ATTACHMENT2,
      gl.COLOR_ATTACHMENT3,
    ]);
    (app as any).renderTargets = (app as any).renderTargets || {};
    (app as any).renderTargets.gbuffer = new WebGL2RenderTarget(
      gl,
      (app as any).gBuffer!,
      width,
      height
    );
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

  setViewport(_app: Application, x: number, y: number, w: number, h: number) {
    this.#gl!.viewport(x, y, w, h);
  }

  getDrawableSize(_app: Application) {
    const c = this.#gl!.canvas as HTMLCanvasElement;
    return { width: c.width, height: c.height };
  }

  // Optional: generic pass API (supports default framebuffer and internal RenderTarget)
  beginPass(_app: Application, desc: RenderPassDescriptor) {
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
  endPass(_app: Application) {
    // No-op for default framebuffer; state is left as configured by beginPass
  }

  debugCollectState(app: Application) {
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
    const rtG = (app as any).renderTargets?.gbuffer as WebGL2RenderTarget | undefined;
    const rtL = (app as any).renderTargets?.lighting as WebGL2RenderTarget | undefined;
    if (rtG) collectFBO("gbuffer", rtG.fbo);
    if (rtL) collectFBO("lighting", rtL.fbo);
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

  debugDumpState(app: Application, tag = "") {
    // eslint-disable-next-line no-console
    console.debug("[WebGL2Renderer.debugDumpState]", tag, this.debugCollectState(app));
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
