export type FilterMode = "nearest" | "linear";
export type MipmapMode = "nearest" | "linear";
export type AddressMode = "clamp-to-edge" | "repeat" | "mirrored-repeat";

export interface SamplerDescriptor {
  minFilter?: FilterMode;
  magFilter?: FilterMode;
  mipmapFilter?: MipmapMode;
  addressModeU?: AddressMode;
  addressModeV?: AddressMode;
  maxAnisotropy?: number;
}

export default interface GfxSampler {
  readonly desc: Required<SamplerDescriptor>;
  dispose(): void;
}
