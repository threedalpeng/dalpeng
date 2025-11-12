export type TextureKind = "2d";

export type TextureFormat =
  | "rgba8unorm"
  | "rgba16f"
  | "rg16f"
  | "r16f"
  | "depth16";

export interface TextureDescriptor2D {
  kind: "2d";
  width: number;
  height: number;
  format: TextureFormat;
}

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

  dispose(): void;
}

