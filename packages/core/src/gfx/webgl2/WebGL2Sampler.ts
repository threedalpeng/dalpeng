import type GfxSampler from "../Sampler";
import type { AddressMode, FilterMode, MipmapMode, SamplerDescriptor } from "../Sampler";

function toDefault(desc?: SamplerDescriptor): Required<SamplerDescriptor> {
  return {
    minFilter: desc?.minFilter ?? "linear",
    magFilter: desc?.magFilter ?? "linear",
    mipmapFilter: desc?.mipmapFilter ?? "linear",
    addressModeU: desc?.addressModeU ?? "clamp-to-edge",
    addressModeV: desc?.addressModeV ?? "clamp-to-edge",
    maxAnisotropy: desc?.maxAnisotropy ?? 1,
  };
}

function toGLMinFilter(
  gl: WebGL2RenderingContext,
  min: FilterMode,
  mip: MipmapMode
): number {
  if (min === "nearest" && mip === "nearest") return gl.NEAREST_MIPMAP_NEAREST;
  if (min === "nearest" && mip === "linear") return gl.NEAREST_MIPMAP_LINEAR;
  if (min === "linear" && mip === "nearest") return gl.LINEAR_MIPMAP_NEAREST;
  return gl.LINEAR_MIPMAP_LINEAR;
}

function toGLWrap(gl: WebGL2RenderingContext, mode: AddressMode): number {
  switch (mode) {
    case "repeat": return gl.REPEAT;
    case "mirrored-repeat": return gl.MIRRORED_REPEAT;
    default: return gl.CLAMP_TO_EDGE;
  }
}

export default class WebGL2Sampler implements GfxSampler {
  readonly desc: Required<SamplerDescriptor>;
  #gl: WebGL2RenderingContext;
  #sampler: WebGLSampler;

  constructor(gl: WebGL2RenderingContext, desc?: SamplerDescriptor) {
    this.#gl = gl;
    this.desc = toDefault(desc);
    this.#sampler = gl.createSampler()!;

    const d = this.desc;
    gl.samplerParameteri(this.#sampler, gl.TEXTURE_MIN_FILTER, toGLMinFilter(gl, d.minFilter, d.mipmapFilter));
    gl.samplerParameteri(this.#sampler, gl.TEXTURE_MAG_FILTER, d.magFilter === "nearest" ? gl.NEAREST : gl.LINEAR);
    gl.samplerParameteri(this.#sampler, gl.TEXTURE_WRAP_S, toGLWrap(gl, d.addressModeU));
    gl.samplerParameteri(this.#sampler, gl.TEXTURE_WRAP_T, toGLWrap(gl, d.addressModeV));

    if (d.maxAnisotropy > 1) {
      const ext = gl.getExtension("EXT_texture_filter_anisotropic");
      if (ext) {
        gl.samplerParameterf(this.#sampler, ext.TEXTURE_MAX_ANISOTROPY_EXT, d.maxAnisotropy);
      }
    }
  }

  bind(unit: number): void {
    this.#gl.bindSampler(unit, this.#sampler);
  }

  unbind(unit: number): void {
    this.#gl.bindSampler(unit, null);
  }

  dispose(): void {
    this.#gl.deleteSampler(this.#sampler);
  }
}
