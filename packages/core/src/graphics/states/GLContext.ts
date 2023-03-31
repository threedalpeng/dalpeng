import { isNil } from "@/utils/basic";
import Framebuffer, { type FramebufferTargetKey } from "./GLFrameBuffer";
import Texture, { type TextureTargetKey } from "./GLTexture";

const CONTEXT_CAPABILTY = {
  BLEND: WebGL2RenderingContext.BLEND,
  CULL_FACE: WebGL2RenderingContext.CULL_FACE,
  DEPTH_TEST: WebGL2RenderingContext.DEPTH_TEST,
  DITHER: WebGL2RenderingContext.DITHER,
  POLYGON_OFFSET_FILL: WebGL2RenderingContext.POLYGON_OFFSET_FILL,
  SAMPLE_ALPHA_TO_COVERAGE: WebGL2RenderingContext.SAMPLE_ALPHA_TO_COVERAGE,
  SAMPLE_COVERAGE: WebGL2RenderingContext.SAMPLE_COVERAGE,
  SCISSOR_TEST: WebGL2RenderingContext.SCISSOR_TEST,
  STENCIL_TEST: WebGL2RenderingContext.STENCIL_TEST,
  RASTERIZER_DISCARD: WebGL2RenderingContext.RASTERIZER_DISCARD,
};
type ContextCapabilityKey = keyof typeof CONTEXT_CAPABILTY;

class GLContext {
  gl: WebGL2RenderingContext;
  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  static create(
    canvas: HTMLCanvasElement,
    options: WebGLContextAttributes | undefined
  ) {
    const gl = canvas.getContext("webgl2", options);
    if (gl === null) {
      throw new Error("Cannot create a WebGL2 Context");
    }
    return new GLContext(gl);
  }

  get canvas() {
    return this.gl.canvas;
  }
  get isReady() {
    if (isNil(this.canvas)) {
      return false;
    }
    return true;
  }

  enable(capability: ContextCapabilityKey) {
    this.gl.enable(CONTEXT_CAPABILTY[capability]);
  }
  isEnabled(capability: ContextCapabilityKey) {
    this.gl.isEnabled(CONTEXT_CAPABILTY[capability]);
  }

  createBuffer() {}

  createShader(name: string = "") {
    return new GLShader(this.gl, name);
  }

  createTexture(name = "", target: TextureTargetKey = "2D") {
    return new Texture(this.gl, name, target);
  }

  createFramebuffer(name = "", target: FramebufferTargetKey = "FRAMEBUFFER") {
    return new Framebuffer(this.gl, name, target);
  }
}

export default GLContext;
