import type GfxTexture from "../Texture";
import type { TextureDescriptorCube, TextureFormat } from "../Texture";

export default class WebGL2CubemapTexture implements GfxTexture {
  readonly kind = "cube" as const;
  readonly format: TextureFormat;
  readonly width: number;
  readonly height: number;
  readonly mipLevels: number;

  #gl: WebGL2RenderingContext;
  #tex: WebGLTexture;

  constructor(gl: WebGL2RenderingContext, desc: TextureDescriptorCube) {
    this.#gl = gl;
    this.format = desc.format;
    this.width = desc.size;
    this.height = desc.size;

    if (desc.mipLevels === 0) {
      this.mipLevels = Math.floor(Math.log2(desc.size)) + 1;
    } else {
      this.mipLevels = desc.mipLevels ?? 1;
    }

    this.#tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.#tex);

    const info = this.#toInternalFormat(desc.format);
    gl.texStorage2D(gl.TEXTURE_CUBE_MAP, this.mipLevels, info.internal, desc.size, desc.size);

    // Sampler parameters
    const hint = desc.samplerHint ?? "linear";
    switch (hint) {
      case "linear-mipmap":
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        break;
      case "linear":
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        break;
      case "nearest":
      default:
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        break;
    }
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
  }

  #toInternalFormat(format: TextureFormat) {
    const gl = this.#gl;
    switch (format) {
      case "rgba16f":
        return { internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT };
      case "rg16f":
        return { internal: gl.RG16F as number, format: gl.RG, type: gl.HALF_FLOAT };
      case "rgba8unorm":
        return { internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
      case "srgba8unorm":
        return { internal: gl.SRGB8_ALPHA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
      default:
        return { internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT };
    }
  }

  /** Upload data to a specific cubemap face at a specific mip level. */
  updateFace(face: number, mip: number, data: ArrayBufferView): void {
    const gl = this.#gl;
    const info = this.#toInternalFormat(this.format);
    const size = Math.max(1, this.width >> mip);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.#tex);
    gl.texSubImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_X + face,
      mip,
      0,
      0,
      size,
      size,
      info.format,
      info.type,
      data
    );
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
  }

  /** No-op for cubemaps — use updateFace instead. */
  update2D(): void {
    // Cubemaps use updateFace
  }

  generateMipmaps(): void {
    const gl = this.#gl;
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.#tex);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
  }

  bind(unit: number): void {
    const gl = this.#gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.#tex);
  }

  get _glTexture(): WebGLTexture {
    return this.#tex;
  }

  dispose(): void {
    this.#gl.deleteTexture(this.#tex);
    // @ts-expect-error invalidate
    this.#tex = null;
  }
}
