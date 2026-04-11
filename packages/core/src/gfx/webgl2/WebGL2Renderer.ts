import { loadProgram, loadShader } from "@/utils/gl";
import type { RendererBackend } from "../RendererBackend";
import type { RenderPassDescriptor } from "../RenderPass";
import WebGL2Buffer from "./WebGL2Buffer";
import WebGL2Program from "./WebGL2Program";
import WebGL2RenderTarget from "./WebGL2RenderTarget";
import WebGL2Sampler from "./WebGL2Sampler";
import WebGL2CubemapTexture from "./WebGL2CubemapTexture";
import WebGL2Texture from "./WebGL2Texture";
import WebGL2VertexArray from "./WebGL2VertexArray";
import { FrameProfiler } from "../../debug";
import { ErrorTracker } from "../../debug";

export default class WebGL2Renderer implements RendererBackend {
  readonly type = "webgl2" as const;
  readonly capabilities: { supportsCompute: boolean; supportsFloatBlend: boolean } = { supportsCompute: false, supportsFloatBlend: false };
  #gl: WebGL2RenderingContext | null = null;
  #supportsFloatBlend = false;
  #lastError: { name: string; tag?: string; time: number } | null = null;

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
    this.#supportsFloatBlend = !!gl.getExtension("EXT_float_blend");
    this.capabilities.supportsFloatBlend = this.#supportsFloatBlend;

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

  resize() { /* FrameResources handles lazy reallocation */ }

  createBuffer(kind: "vertex" | "index") {
    return new WebGL2Buffer(this.#gl!, kind);
  }

  createVertexArray() {
    return new WebGL2VertexArray(this.#gl!);
  }

  createTexture(desc: import("../Texture").TextureDescriptor) {
    if (desc.kind === "cube") {
      return new WebGL2CubemapTexture(this.#gl!, desc);
    }
    return new WebGL2Texture(this.#gl!, desc);
  }
  createSampler(desc?: import("../Sampler").SamplerDescriptor) {
    return new WebGL2Sampler(this.#gl!, desc);
  }

  createRenderTarget(desc: import("../RenderTarget").RenderTargetDescriptor): import("../RenderTarget").RenderTarget {
    const gl = this.#gl!;
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    const colorTextures: import("../Texture").default[] = [];
    const drawBufs: GLenum[] = [];

    const mipLevel = desc.mipLevel ?? 0;

    if (desc.colorAttachments) {
      for (let i = 0; i < desc.colorAttachments.length; i++) {
        const tex = desc.colorAttachments[i];
        if (tex) {
          const glTex = tex.kind === "cube"
            ? (tex as WebGL2CubemapTexture)._glTexture
            : (tex as WebGL2Texture)._glTexture;
          const target = tex.kind === "cube" && desc.cubeFace !== undefined
            ? gl.TEXTURE_CUBE_MAP_POSITIVE_X + desc.cubeFace
            : gl.TEXTURE_2D;
          gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0 + i,
            target,
            glTex,
            mipLevel
          );
          colorTextures.push(tex);
          drawBufs.push(gl.COLOR_ATTACHMENT0 + i);
        } else {
          drawBufs.push(gl.NONE);
        }
      }
    }

    if (drawBufs.length > 0) {
      gl.drawBuffers(drawBufs);
    } else {
      gl.drawBuffers([gl.NONE]);
    }

    let depthTexture: import("../Texture").default | undefined;
    if (desc.depthAttachment) {
      const glTex = (desc.depthAttachment as WebGL2Texture)._glTexture;
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.TEXTURE_2D,
        glTex,
        0
      );
      depthTexture = desc.depthAttachment;
    }

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error(`[createRenderTarget] FBO not complete: 0x${status.toString(16)}`);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return new WebGL2RenderTarget(
      gl,
      fbo,
      desc.width,
      desc.height,
      colorTextures.length > 0 ? colorTextures : undefined,
      depthTexture,
    );
  }

  destroyRenderTarget(rt: import("../RenderTarget").RenderTarget): void {
    const gl = this.#gl!;
    const wrt = rt as WebGL2RenderTarget;
    gl.deleteFramebuffer(wrt.fbo);
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
    FrameProfiler.recordDraw(Math.floor(opts.count / 3));
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
    FrameProfiler.recordDraw(Math.floor(opts.count / 3));
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
    FrameProfiler.recordDraw(Math.floor((opts.count / 3) * opts.instanceCount));
    va.unbind();
  }

  setViewport(x: number, y: number, w: number, h: number) {
    this.#gl!.viewport(x, y, w, h);
  }

  setCullFace(enabled: boolean): void {
    const gl = this.#gl!;
    if (enabled) {
      gl.enable(gl.CULL_FACE);
    } else {
      gl.disable(gl.CULL_FACE);
    }
  }

  setGenericIntegerAttrib(location: number, x: number, y: number, z: number, w: number): void {
    this.#gl!.vertexAttribI4i(location, x, y, z, w);
  }

  getDrawableSize() {
    const c = this.#gl!.canvas as HTMLCanvasElement;
    return { width: c.width, height: c.height };
  }

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

    if (typeof desc.depthTest === "boolean") {
      if (desc.depthTest) gl.enable(gl.DEPTH_TEST);
      else gl.disable(gl.DEPTH_TEST);
    }

    if (desc.blend?.enable) {
      gl.enable(gl.BLEND);
      const mode = desc.blend.mode ?? "additive";
      if (mode === "alpha") {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      } else if (mode === "premultiplied-additive") {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      } else {
        gl.blendFunc(gl.ONE, gl.ONE);
      }
    } else {
      gl.disable(gl.BLEND);
    }

    if (desc.colorWrite === false) {
      gl.colorMask(false, false, false, false);
    }

    if (desc.polygonOffset) {
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(desc.polygonOffset.factor, desc.polygonOffset.units);
    } else if (desc.polygonOffset === null) {
      gl.disable(gl.POLYGON_OFFSET_FILL);
    }

    // Clear buffers BEFORE setting depthMask to the desired value.
    // gl.clear(DEPTH_BUFFER_BIT) is a no-op when depthMask is false,
    // so temporarily enable it when a depth clear is requested.
    let clearBits = 0;
    if (desc.clearColor) {
      gl.clearColor(desc.clearColor[0], desc.clearColor[1], desc.clearColor[2], desc.clearColor[3]);
      clearBits |= gl.COLOR_BUFFER_BIT;
    }
    if (typeof desc.clearDepth === "number") {
      gl.clearDepth(desc.clearDepth);
      gl.depthMask(true);
      clearBits |= gl.DEPTH_BUFFER_BIT;
    }
    if (clearBits) gl.clear(clearBits);

    if (typeof desc.depthWrite === "boolean") gl.depthMask(!!desc.depthWrite);
  }
  endPass() {
    const gl = this.#gl!;
    gl.colorMask(true, true, true, true);
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }

  debugCollectState() {
    const gl = this.#gl!;
    const cap = {
      extColorBufferFloat: !!gl.getExtension("EXT_color_buffer_float"),
      extFloatBlend: this.#supportsFloatBlend,
    };

    const fb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    const rfb = gl.getParameter((gl as any).READ_FRAMEBUFFER_BINDING ?? gl.FRAMEBUFFER_BINDING);
    const dfb = gl.getParameter((gl as any).DRAW_FRAMEBUFFER_BINDING ?? gl.FRAMEBUFFER_BINDING);

    const maxDB: number = gl.getParameter(gl.MAX_DRAW_BUFFERS) as number;
    const drawBuffers: number[] = [];
    for (let i = 0; i < Math.min(8, maxDB); i++) {
      const val = gl.getParameter((gl as any)[`DRAW_BUFFER${i}`]);
      drawBuffers.push(val);
    }

    const activeTex = gl.getParameter(gl.ACTIVE_TEXTURE);
    const tex2D: (WebGLTexture | null)[] = [];
    for (let i = 0; i < 8; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      tex2D.push(gl.getParameter(gl.TEXTURE_BINDING_2D));
    }
    gl.activeTexture(activeTex);

    const prog = gl.getParameter(gl.CURRENT_PROGRAM);
    const vao = gl.getParameter((gl as any).VERTEX_ARRAY_BINDING ?? null);
    const arrBuf = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
    const idxBuf = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);

    const blend = gl.isEnabled(gl.BLEND);
    const depthTest = gl.isEnabled(gl.DEPTH_TEST);
    const cull = gl.isEnabled(gl.CULL_FACE);
    const viewport = gl.getParameter(gl.VIEWPORT);
    const depthMask = gl.getParameter(gl.DEPTH_WRITEMASK);
    const colorMask = gl.getParameter(gl.COLOR_WRITEMASK);

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
      ErrorTracker.record(tag, name, "error");
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
