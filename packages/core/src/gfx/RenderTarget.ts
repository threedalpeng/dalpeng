import type GfxTexture from "./Texture";

export interface RenderTargetDescriptor {
  width: number;
  height: number;
  colorAttachments?: Array<GfxTexture | undefined>;
  depthAttachment?: GfxTexture;
  cubeFace?: number;   // 0-5 for cubemap texture attachments
  mipLevel?: number;   // mip level for cubemap attachments (default 0)
}

export interface RenderTarget {
  readonly width: number;
  readonly height: number;
  readonly colorTextures?: ReadonlyArray<GfxTexture>;
  readonly depthTexture?: GfxTexture;
}
