import type GfxTexture from "../Texture";
import type { RenderTarget } from "../RenderTarget";

export default class WebGL2RenderTarget implements RenderTarget {
  constructor(
    readonly gl: WebGL2RenderingContext,
    readonly fbo: WebGLFramebuffer,
    readonly width: number,
    readonly height: number,
    readonly colorTextures?: ReadonlyArray<GfxTexture>,
    readonly depthTexture?: GfxTexture,
  ) {}
}
