export type TextureKind = "2d" | "cube";

export type TextureFormat =
  | "rgba8unorm" | "srgba8unorm" | "rgba16f" | "rg16f" | "r16f"
  | "depth16" | "depth24unorm";

export type SamplerHint = "nearest" | "linear" | "depth" | "linear-mipmap";

export interface TextureDescriptor2D {
  kind: "2d";
  width: number;
  height: number;
  format: TextureFormat;
  mipLevels?: number;
  samplerHint?: SamplerHint;
}

export interface TextureDescriptorCube {
  kind: "cube";
  size: number;
  format: TextureFormat;
  mipLevels?: number;     // 0 = auto full chain
  samplerHint?: SamplerHint;
}

export type TextureDescriptor = TextureDescriptor2D | TextureDescriptorCube;

export default interface GfxTexture {
  readonly kind: TextureKind;
  readonly width: number;
  readonly height: number;
  readonly format: TextureFormat;

  // Upload/resize for 2D textures
  update2D(
    data: TexImageSource | ArrayBufferView | null,
    desc?: Partial<Omit<TextureDescriptor2D, "kind">>
  ): void;

  generateMipmaps?(): void;
  bind(unit: number): void;

  dispose(): void;
}
