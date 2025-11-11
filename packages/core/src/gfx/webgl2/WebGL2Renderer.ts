import type Application from "@/Application";
import type { RendererBackend } from "../RendererBackend";
import WebGL2Buffer from "./WebGL2Buffer";
import WebGL2VertexArray from "./WebGL2VertexArray";
import { loadProgram, loadShader } from "@/utils/gl";
import WebGL2Program from "./WebGL2Program";

export default class WebGL2Renderer implements RendererBackend {
  readonly type = "webgl2" as const;
  readonly capabilities = { supportsCompute: false } as const;
  #gl: WebGL2RenderingContext | null = null;
  #dw = 0;
  #dh = 0;

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
    const gl = app.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, (app as any).gBuffer!);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }
  endGeometryPass(app: Application) {
    const gl = app.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  beginLightingPass(app: Application) {
    const gl = app.gl;
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }
  endLightingPass(_app: Application) {}

  resize(app: Application) {
    const gl = this.#gl!;
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    if (w === this.#dw && h === this.#dh) return;
    this.#allocateGBuffer(app, w, h);
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
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, (app as any).gPositionMetallic!, 0);

    (app as any).gNormalRoughness = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gNormalRoughness!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, (app as any).gNormalRoughness!, 0);

    (app as any).gAlbedo = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gAlbedo!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, (app as any).gAlbedo!, 0);

    (app as any).gEmissive = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gEmissive!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT3, gl.TEXTURE_2D, (app as any).gEmissive!, 0);

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
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Bind G-Buffer to texture units
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gPositionMetallic);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gNormalRoughness);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gAlbedo);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, (app as any).gEmissive);
  }

  createBuffer(kind: "vertex" | "index") {
    return new WebGL2Buffer(this.#gl!, kind);
  }

  createVertexArray() {
    return new WebGL2VertexArray(this.#gl!);
  }

  drawIndexed(vao: WebGL2VertexArray, opts: { count: number; type?: "uint16" | "uint32"; mode?: "triangles" | "lines" }) {
    const gl = this.#gl!;
    vao.bind();
    const typeEnum = opts.type === "uint32" ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    const modeEnum = opts.mode === "lines" ? gl.LINES : gl.TRIANGLES;
    gl.drawElements(modeEnum, opts.count, typeEnum, 0);
    vao.unbind();
  }

  drawArrays(vao: WebGL2VertexArray, opts: { mode: "triangle-strip" | "triangles" | "lines"; first?: number; count: number }) {
    const gl = this.#gl!;
    vao.bind();
    const modeEnum = opts.mode === "triangle-strip" ? gl.TRIANGLE_STRIP : opts.mode === "lines" ? gl.LINES : gl.TRIANGLES;
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
}
