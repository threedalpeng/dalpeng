import { Mat4 } from "@dalpeng/math";
import { loadHdr } from "../asset/HdrLoader";
import type GfxBuffer from "../gfx/Buffer";
import type { RendererBackend } from "../gfx/RendererBackend";
import type GfxTexture from "../gfx/Texture";
import type GfxVertexArray from "../gfx/VertexArray";
import Shader from "../graphics/Shader";
import { f32ArrayToF16 } from "../utils/float16";

import brdfLutFrag from "../shaders/ibl/brdf_lut.frag?raw";
import cubeVert from "../shaders/ibl/cube.vert?raw";
import equirectToCubeFrag from "../shaders/ibl/equirect_to_cube.frag?raw";
import irradianceFrag from "../shaders/ibl/irradiance.frag?raw";
import prefilterFrag from "../shaders/ibl/prefilter.frag?raw";
import mainVert from "../shaders/main.vert?raw";

export interface IBLResources {
  envCubemap: GfxTexture; // 512 cube, rgba16f
  irradianceCubemap: GfxTexture; // 32 cube, rgba16f
  prefilteredCubemap: GfxTexture; // 128 cube, rgba16f, 5 mip levels
  brdfLUT: GfxTexture; // 512x512, rg16f, 2D
}

// Unit cube: 36 vertices (6 faces x 2 triangles x 3 vertices), no index buffer needed.
// prettier-ignore
const CUBE_VERTS = new Float32Array([
  // -Z face
  -1, -1, -1,   1,  1, -1,   1, -1, -1,
  -1, -1, -1,  -1,  1, -1,   1,  1, -1,
  // +Z face
  -1, -1,  1,   1, -1,  1,   1,  1,  1,
  -1, -1,  1,   1,  1,  1,  -1,  1,  1,
  // -X face
  -1, -1, -1,  -1, -1,  1,  -1,  1,  1,
  -1, -1, -1,  -1,  1,  1,  -1,  1, -1,
  // +X face
   1, -1,  1,   1, -1, -1,   1,  1, -1,
   1, -1,  1,   1,  1, -1,   1,  1,  1,
  // -Y face
  -1, -1, -1,   1, -1, -1,   1, -1,  1,
  -1, -1, -1,   1, -1,  1,  -1, -1,  1,
  // +Y face
  -1,  1,  1,   1,  1,  1,   1,  1, -1,
  -1,  1,  1,   1,  1, -1,  -1,  1, -1,
]);

function lookAt(eye: number[], center: number[], up: number[]): Float32Array {
  const fx = center[0] - eye[0];
  const fy = center[1] - eye[1];
  const fz = center[2] - eye[2];
  const fLen = Math.sqrt(fx * fx + fy * fy + fz * fz);
  const f = [fx / fLen, fy / fLen, fz / fLen];

  const sx = f[1] * up[2] - f[2] * up[1];
  const sy = f[2] * up[0] - f[0] * up[2];
  const sz = f[0] * up[1] - f[1] * up[0];
  const sLen = Math.sqrt(sx * sx + sy * sy + sz * sz);
  const s = [sx / sLen, sy / sLen, sz / sLen];

  const u = [s[1] * f[2] - s[2] * f[1], s[2] * f[0] - s[0] * f[2], s[0] * f[1] - s[1] * f[0]];

  const tx = -(s[0] * eye[0] + s[1] * eye[1] + s[2] * eye[2]);
  const ty = -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]);
  const tz = f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2];

  // column-major (WebGL): col0=s, col1=u, col2=-f, col3=translation
  // prettier-ignore
  return new Float32Array([
    s[0], u[0], -f[0], 0,
    s[1], u[1], -f[1], 0,
    s[2], u[2], -f[2], 0,
    tx,   ty,   tz,    1,
  ]);
}

function cubemapViewMatrices(): Float32Array[] {
  return [
    lookAt([0, 0, 0], [1, 0, 0], [0, -1, 0]), // +X
    lookAt([0, 0, 0], [-1, 0, 0], [0, -1, 0]), // -X
    lookAt([0, 0, 0], [0, 1, 0], [0, 0, 1]), // +Y
    lookAt([0, 0, 0], [0, -1, 0], [0, 0, -1]), // -Y
    lookAt([0, 0, 0], [0, 0, 1], [0, -1, 0]), // +Z
    lookAt([0, 0, 0], [0, 0, -1], [0, -1, 0]), // -Z
  ];
}

export default class IBLPrecompute {
  #resources: IBLResources | null = null;
  #cubeVao: GfxVertexArray | null = null;
  #cubeVbo: GfxBuffer | null = null;
  #quadVao: GfxVertexArray | null = null;
  #quadVbo: GfxBuffer | null = null;

  get resources(): IBLResources | null {
    return this.#resources;
  }

  async precompute(backend: RendererBackend, hdrUrl: string): Promise<void> {
    const hdr = await loadHdr(hdrUrl);

    const equirectTex = backend.createTexture({
      kind: "2d",
      width: hdr.width,
      height: hdr.height,
      format: "rgba16f",
      samplerHint: "linear",
    });
    const f16Data = f32ArrayToF16(hdr.data);
    equirectTex.update2D(f16Data, {
      width: hdr.width,
      height: hdr.height,
      format: "rgba16f",
    });

    const shaderEquirect = new Shader("ibl-equirect");
    const shaderIrradiance = new Shader("ibl-irradiance");
    const shaderPrefilter = new Shader("ibl-prefilter");
    const shaderBrdfLut = new Shader("ibl-brdf-lut");

    for (const s of [shaderEquirect, shaderIrradiance, shaderPrefilter, shaderBrdfLut]) {
      s.bindBackend(backend);
    }

    await Promise.all([
      shaderEquirect.loadFrom(cubeVert, equirectToCubeFrag),
      shaderIrradiance.loadFrom(cubeVert, irradianceFrag),
      shaderPrefilter.loadFrom(cubeVert, prefilterFrag),
      shaderBrdfLut.loadFrom(mainVert, brdfLutFrag),
    ]);

    this.#ensureCubeGeometry(backend, shaderEquirect);
    this.#ensureQuadGeometry(backend, shaderBrdfLut);

    const captureProjection = Mat4.toWebGL(Mat4.perspective(Math.PI / 2, 1, 0.1, 10.0));
    const captureViews = cubemapViewMatrices();

    backend.setCullFace?.(false); // cube faces may have inconsistent winding

    const ENV_SIZE = 512;
    const envCubemap = backend.createTexture({
      kind: "cube",
      size: ENV_SIZE,
      format: "rgba16f",
      mipLevels: 0, // auto full mip chain (for later mipmap generation)
      samplerHint: "linear-mipmap",
    });

    shaderEquirect.use();
    equirectTex.bind(0);
    shaderEquirect.setUniform1i("uEquirect", 0);
    shaderEquirect.setUniformMat4("uProjection", captureProjection);
    this.#renderToCubeFaces(backend, envCubemap, ENV_SIZE, 0, captureViews, shaderEquirect);

    envCubemap.generateMipmaps!();
    equirectTex.dispose();

    const IRR_SIZE = 32;
    const irradianceCubemap = backend.createTexture({
      kind: "cube",
      size: IRR_SIZE,
      format: "rgba16f",
      mipLevels: 1,
      samplerHint: "linear",
    });

    shaderIrradiance.use();
    envCubemap.bind(0);
    shaderIrradiance.setUniform1i("uEnvironment", 0);
    shaderIrradiance.setUniformMat4("uProjection", captureProjection);
    this.#renderToCubeFaces(
      backend,
      irradianceCubemap,
      IRR_SIZE,
      0,
      captureViews,
      shaderIrradiance
    );

    const PREF_SIZE = 128;
    const MAX_MIP = 4; // mip 0..4 = 5 levels
    const prefilteredCubemap = backend.createTexture({
      kind: "cube",
      size: PREF_SIZE,
      format: "rgba16f",
      mipLevels: MAX_MIP + 1,
      samplerHint: "linear-mipmap",
    });

    shaderPrefilter.use();
    envCubemap.bind(0);
    shaderPrefilter.setUniform1i("uEnvironment", 0);
    shaderPrefilter.setUniformMat4("uProjection", captureProjection);

    for (let mip = 0; mip <= MAX_MIP; mip++) {
      const mipSize = PREF_SIZE >> mip;
      shaderPrefilter.setUniform1f("uRoughness", mip / MAX_MIP);
      this.#renderToCubeFaces(
        backend,
        prefilteredCubemap,
        mipSize,
        mip,
        captureViews,
        shaderPrefilter
      );
    }

    backend.setCullFace?.(true);

    const LUT_SIZE = 512;
    const brdfLUT = backend.createTexture({
      kind: "2d",
      width: LUT_SIZE,
      height: LUT_SIZE,
      format: "rg16f",
      samplerHint: "linear",
    });

    const brdfRT = backend.createRenderTarget({
      width: LUT_SIZE,
      height: LUT_SIZE,
      colorAttachments: [brdfLUT],
    });

    shaderBrdfLut.use();
    shaderBrdfLut.setUniformVec2("uResolution", new Float32Array([LUT_SIZE, LUT_SIZE]));

    backend.beginPass({
      target: brdfRT,
      depthTest: false,
      depthWrite: false,
      blend: { enable: false },
      clearColor: [0, 0, 0, 0],
      viewport: { x: 0, y: 0, w: LUT_SIZE, h: LUT_SIZE },
    });
    backend.drawArrays(this.#quadVao!, { mode: "triangle-strip", count: 4 });
    backend.endPass();
    backend.destroyRenderTarget(brdfRT);

    shaderEquirect.clear();
    shaderIrradiance.clear();
    shaderPrefilter.clear();
    shaderBrdfLut.clear();

    this.#resources = { envCubemap, irradianceCubemap, prefilteredCubemap, brdfLUT };
  }

  #renderToCubeFaces(
    backend: RendererBackend,
    cubemap: GfxTexture,
    faceSize: number,
    mip: number,
    views: Float32Array[],
    shader: Shader
  ): void {
    for (let face = 0; face < 6; face++) {
      const rt = backend.createRenderTarget({
        width: faceSize,
        height: faceSize,
        colorAttachments: [cubemap],
        cubeFace: face,
        mipLevel: mip,
      });

      shader.setUniformMat4("uView", views[face]);

      backend.beginPass({
        target: rt,
        depthTest: false,
        depthWrite: false,
        blend: { enable: false },
        clearColor: [0, 0, 0, 0],
        viewport: { x: 0, y: 0, w: faceSize, h: faceSize },
        colorAttachments: [0],
      });
      backend.drawArrays(this.#cubeVao!, { mode: "triangles", count: 36 });
      backend.endPass();

      backend.destroyRenderTarget(rt);
    }
  }

  #ensureCubeGeometry(backend: RendererBackend, shader: Shader): void {
    if (this.#cubeVao) return;
    this.#cubeVao = backend.createVertexArray();
    this.#cubeVbo = backend.createBuffer("vertex");
    this.#cubeVbo.update(CUBE_VERTS);
    const posLoc = shader.getAttribLocation("aPosition");
    this.#cubeVao.setVertexBuffer(posLoc, this.#cubeVbo, 3);
  }

  #ensureQuadGeometry(backend: RendererBackend, shader: Shader): void {
    if (this.#quadVao) return;
    this.#quadVao = backend.createVertexArray();
    this.#quadVbo = backend.createBuffer("vertex");
    // Triangle-strip: BL, BR, TL, TR — vec3 positions to match main.vert
    const quad = new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]);
    this.#quadVbo.update(quad);
    const posLoc = shader.getAttribLocation("aPosition");
    this.#quadVao.setVertexBuffer(posLoc, this.#quadVbo, 3);
  }

  dispose(): void {
    if (this.#resources) {
      this.#resources.envCubemap.dispose();
      this.#resources.irradianceCubemap.dispose();
      this.#resources.prefilteredCubemap.dispose();
      this.#resources.brdfLUT.dispose();
      this.#resources = null;
    }
    // VAO/VBO kept alive for re-use across precompute() calls (e.g. HDR map changes)
  }
}
