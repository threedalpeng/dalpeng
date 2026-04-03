import type GfxTexture from "../Texture";
import type { TextureDescriptor2D, TextureFormat } from "../Texture";

export default class WebGL2Texture implements GfxTexture {
  readonly kind = "2d" as const;
  readonly format: TextureFormat;
  #gl: WebGL2RenderingContext;
  #tex: WebGLTexture;
  #mipLevels: number;
  width: number;
  height: number;

  constructor(gl: WebGL2RenderingContext, desc: TextureDescriptor2D) {
    this.#gl = gl;
    this.format = desc.format;
    this.width = desc.width;
    this.height = desc.height;
    this.#mipLevels =
      desc.mipLevels === 0
        ? Math.floor(Math.log2(Math.max(desc.width, desc.height))) + 1
        : (desc.mipLevels ?? 1);
    this.#tex = gl.createTexture()!;
    this.#allocate(desc.width, desc.height, desc.format);

    // Apply sampler parameters based on hint
    const hint = desc.samplerHint ?? "nearest";
    gl.bindTexture(gl.TEXTURE_2D, this.#tex);
    switch (hint) {
      case "linear":
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        break;
      case "depth":
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.NONE);
        break;
      case "nearest":
      default:
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        break;
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  #toInternalFormat(format: TextureFormat) {
    const gl = this.#gl;
    switch (format) {
      case "rgba8unorm":
        return { internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
      case "srgba8unorm":
        return { internal: gl.SRGB8_ALPHA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
      case "rgba16f":
        return { internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT }; // EXT_color_buffer_float required
      case "rg16f":
        return { internal: gl.RG16F as number, format: gl.RG, type: gl.HALF_FLOAT };
      case "r16f":
        return { internal: gl.R16F as number, format: gl.RED, type: gl.HALF_FLOAT };
      case "depth16":
        return {
          internal: gl.DEPTH_COMPONENT16,
          format: gl.DEPTH_COMPONENT,
          type: gl.UNSIGNED_SHORT,
        };
      case "depth24unorm":
        return {
          internal: gl.DEPTH_COMPONENT24,
          format: gl.DEPTH_COMPONENT,
          type: gl.UNSIGNED_INT,
        };
      default:
        return { internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
    }
  }

  #allocate(width: number, height: number, format: TextureFormat) {
    const gl = this.#gl;
    const info = this.#toInternalFormat(format);
    gl.bindTexture(gl.TEXTURE_2D, this.#tex);
    if ((gl as any).texStorage2D && info.format !== gl.DEPTH_COMPONENT) {
      try {
        (gl as any).texStorage2D(gl.TEXTURE_2D, this.#mipLevels, info.internal, width, height);
      } catch {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          info.internal,
          width,
          height,
          0,
          info.format,
          info.type,
          null
        );
      }
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        info.internal,
        width,
        height,
        0,
        info.format,
        info.type,
        null
      );
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  update2D(
    data: TexImageSource | ArrayBufferView | null,
    desc?: Partial<Omit<TextureDescriptor2D, "kind">>
  ): void {
    const gl = this.#gl;
    const width = desc?.width ?? this.width;
    const height = desc?.height ?? this.height;
    const format = desc?.format ?? this.format;
    const info = this.#toInternalFormat(format);

    const needRealloc = width !== this.width || height !== this.height || format !== this.format;
    gl.bindTexture(gl.TEXTURE_2D, this.#tex);
    if (needRealloc) {
      this.#allocate(width, height, format);
      this.width = width;
      this.height = height;
      (this as any).format = format;
    }

    if (data) {
      if (data instanceof Uint8Array || ArrayBuffer.isView(data as any)) {
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          width,
          height,
          info.format,
          info.type,
          data as any
        );
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, info.format, info.type, data as any);
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  generateMipmaps(): void {
    const gl = this.#gl;
    gl.bindTexture(gl.TEXTURE_2D, this.#tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  bind(unit: number): void {
    const gl = this.#gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.#tex);
  }

  get _glTexture() {
    return this.#tex;
  }

  dispose(): void {
    this.#gl.deleteTexture(this.#tex);
    // @ts-expect-error invalidate
    this.#tex = null;
  }
}
