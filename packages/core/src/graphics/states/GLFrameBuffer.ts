import GLState from "./GLState";
import type Texture from "./GLTexture";
import { BindableState, autobound } from "./decorators";

const FRAMEBUFFER_TARGET = {
  FRAMEBUFFER: WebGL2RenderingContext.FRAMEBUFFER,
  DRAW_FRAMEBUFFER: WebGL2RenderingContext.DRAW_FRAMEBUFFER,
  READ_FRAMEBUFFER: WebGL2RenderingContext.READ_FRAMEBUFFER,
};
export type FramebufferTargetKey = keyof typeof FRAMEBUFFER_TARGET;
type FramebufferTarget = typeof FRAMEBUFFER_TARGET[FramebufferTargetKey];

type FramebufferAttachableBuffer =
  | "COLOR"
  | "DEPTH"
  | "STENCIL"
  | "DEPTH_STENCIL";
type FramebufferAttachment = keyof typeof WebGL2RenderingContext &
  (`${FramebufferAttachableBuffer}_ATTACHMENT` | `COLOR_ATTACHMENT${number}`);
const FRAMEBUFFER_ATTACHMENT = Object.fromEntries(
  (
    Object.keys(WebGL2RenderingContext).filter((key) =>
      key.includes("_ATTACHMENT")
    ) as FramebufferAttachment[]
  ).map((key) => [key, WebGL2RenderingContext[key]])
) as {
  [key in FramebufferAttachment]: WebGL2RenderingContext[key];
};

const FRAMEBUFFER_TEXTARGET = {
  "2D": WebGL2RenderingContext.TEXTURE_2D,
  CUBE_MAP_POSITIVE_X: WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X,
  CUBE_MAP_POSITIVE_Y: WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y,
  CUBE_MAP_POSITIVE_Z: WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z,
  CUBE_MAP_NEGATIVE_X: WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X,
  CUBE_MAP_NEGATIVE_Y: WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y,
  CUBE_MAP_NEGATIVE_Z: WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z,
};
type FramebufferTextarget = keyof typeof FRAMEBUFFER_TEXTARGET;

export default class Framebuffer extends GLState implements BindableResource {
  base: WebGLFramebuffer;

  #targetKey: FramebufferTargetKey;
  get targetKey() {
    return this.#targetKey;
  }
  #target: FramebufferTarget;
  get target() {
    return this.#target;
  }

  constructor(
    gl: WebGL2RenderingContext,
    name = "",
    target: FramebufferTargetKey = "FRAMEBUFFER"
  ) {
    super(gl);
    this.base = gl.createFramebuffer()!;
    this.#targetKey = target;
    this.#target = FRAMEBUFFER_TARGET[target];
  }

  bind() {
    this.gl.bindFramebuffer(this.#target, this.base);
  }
  unbind() {
    this.gl.bindFramebuffer(this.#target, null);
  }

  @autobound
  registerTexture2D(
    texture: Texture,
    attachment: FramebufferAttachment,
    textarget: FramebufferTextarget
  ) {
    this.gl.texStorage2D(
      WebGL2RenderingContext.TEXTURE_2D,
      1,
      WebGL2RenderingContext.RGBA16F,
      this.gl.drawingBufferWidth,
      this.gl.drawingBufferHeight
    );
    this.gl.framebufferTexture2D(
      this.#target,
      FRAMEBUFFER_ATTACHMENT[attachment],
      FRAMEBUFFER_TEXTARGET[textarget],
      texture.base,
      0
    );
  }
}
