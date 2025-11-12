import type GfxSampler from "../Sampler";
import type { SamplerDescriptor, AddressMode, FilterMode, MipmapMode } from "../Sampler";

function toDefault(desc?: SamplerDescriptor): Required<SamplerDescriptor> {
  return {
    minFilter: desc?.minFilter ?? ("linear" as FilterMode),
    magFilter: desc?.magFilter ?? ("linear" as FilterMode),
    mipmapFilter: desc?.mipmapFilter ?? ("nearest" as MipmapMode),
    addressModeU: desc?.addressModeU ?? ("clamp-to-edge" as AddressMode),
    addressModeV: desc?.addressModeV ?? ("clamp-to-edge" as AddressMode),
    maxAnisotropy: desc?.maxAnisotropy ?? 1,
  };
}

export default class WebGL2Sampler implements GfxSampler {
  readonly desc: Required<SamplerDescriptor>;
  constructor(desc?: SamplerDescriptor) {
    this.desc = toDefault(desc);
  }
  dispose(): void {
    // WebGL2 does not require separate sampler objects for our current usage; no GL resource to free.
  }
}
