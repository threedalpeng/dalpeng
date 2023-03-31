import Resource from "./GLState";
import { BindableState, autobound } from "./decorators";

interface TextureParameters {
  magFilters: keyof typeof MAG_FILTERS_PARAM;
  minFilters: keyof typeof MIN_FILTERS_PARAM;
  wrapS: keyof typeof WRAP_S_PARAM;
  wrapT: keyof typeof WRAP_T_PARAM;
}

const TEXTURE_TARGET = {
  "2D": WebGL2RenderingContext.TEXTURE_2D,
  "2D_ARRAY": WebGL2RenderingContext.TEXTURE_2D_ARRAY,
  "3D": WebGL2RenderingContext.TEXTURE_3D,
  CUBE_MAP: WebGL2RenderingContext.TEXTURE_CUBE_MAP,
};
export type TextureTargetKey = keyof typeof TEXTURE_TARGET;
type TextureTarget = typeof TEXTURE_TARGET[TextureTargetKey];

const MAG_FILTERS_PARAM = {
  LINEAR: WebGL2RenderingContext.LINEAR,
  NEAREST: WebGL2RenderingContext.NEAREST,
};
const MIN_FILTERS_PARAM = {
  LINEAR: WebGL2RenderingContext.LINEAR,
  NEAREST: WebGL2RenderingContext.NEAREST,
  NEAREST_MIPMAP_NEAREST: WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST,
  LINEAR_MIPMAP_NEAREST: WebGL2RenderingContext.LINEAR_MIPMAP_NEAREST,
  NEAREST_MIPMAP_LINEAR: WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR,
  LINEAR_MIPMAP_LINEAR: WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR,
};
const WRAP_S_PARAM = {
  REPEAT: WebGL2RenderingContext.REPEAT,
  CLAMP_TO_EDGE: WebGL2RenderingContext.CLAMP_TO_EDGE,
  MIRRORED_REPEAT: WebGL2RenderingContext.MIRRORED_REPEAT,
};
const WRAP_T_PARAM = {
  REPEAT: WebGL2RenderingContext.REPEAT,
  CLAMP_TO_EDGE: WebGL2RenderingContext.CLAMP_TO_EDGE,
  MIRRORED_REPEAT: WebGL2RenderingContext.MIRRORED_REPEAT,
};

export default class Texture extends Resource implements BindableState {
  base: WebGLTexture;

  #targetKey: TextureTargetKey;
  get targetKey() {
    return this.#targetKey;
  }
  #target: TextureTarget;
  get target() {
    return this.#target;
  }

  constructor(gl: WebGL2RenderingContext, target: TextureTargetKey = "2D") {
    super(gl);
    this.base = gl.createTexture()!;
    this.#targetKey = target;
    this.#target = TEXTURE_TARGET[target];
  }

  bind() {
    this.gl.bindTexture(this.#target, this.base);
  }
  unbind() {
    this.gl.bindTexture(this.#target, null);
  }

  @autobound
  setParams(params: Partial<TextureParameters> = {}) {
    const { magFilters, minFilters, wrapS, wrapT } = params;

    if (magFilters) {
      this.gl.texParameteri(
        this.#target,
        WebGL2RenderingContext.TEXTURE_MAG_FILTER,
        MAG_FILTERS_PARAM[magFilters]
      );
    }
    if (minFilters) {
      this.gl.texParameteri(
        this.#target,
        WebGL2RenderingContext.TEXTURE_MIN_FILTER,
        MIN_FILTERS_PARAM[minFilters]
      );
    }
    if (wrapS) {
      this.gl.texParameteri(
        this.#target,
        WebGL2RenderingContext.TEXTURE_WRAP_S,
        WRAP_S_PARAM[wrapS]
      );
    }
    if (wrapT) {
      this.gl.texParameteri(
        this.#target,
        WebGL2RenderingContext.TEXTURE_WRAP_T,
        WRAP_T_PARAM[wrapT]
      );
    }
  }

  storage(level, internalformat, width, height): void;
  storage(level, internalformat, width, height, depth = 1) {
    if (this.targetKey === "2D" || this.targetKey === "CUBE_MAP") {
      this.gl.texStorage2D(this.target, level, internalformat, width, height);
    } else {
      this.gl.texStorage3D(
        this.target,
        level,
        internalformat,
        this.gl.drawingBufferWidth,
        this.gl.drawingBufferHeight,
        depth
      );
    }
  }
}
