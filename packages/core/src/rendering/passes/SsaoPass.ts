import type { RendererBackend } from "../../gfx/RendererBackend";
import type GfxTexture from "../../gfx/Texture";
import Camera from "../../graphics/Camera";
import { f32ArrayToF16 } from "../../utils/float16";
import type { RenderFrameContext, RenderInitContext, RenderPass } from "./RenderPass";

export default class SsaoPass implements RenderPass {
  readonly name = "ssao";

  #noiseTex: GfxTexture | null = null;
  #kernel: Float32Array = new Float32Array(0);
  #noiseScale = new Float32Array(2);

  init(ctx: RenderInitContext): void {
    const { renderer, shaders } = ctx;
    shaders.ssao.use();
    shaders.ssao.setUniform1i("gPositionMetallic", 0);
    shaders.ssao.setUniform1i("gNormalRoughness", 1);
    shaders.ssao.setUniform1i("uNoiseTex", 9);

    shaders.ssaoBlur.use();
    shaders.ssaoBlur.setUniform1i("uSSAORaw", 0);

    this.#noiseTex = this.#createNoiseTex(renderer);
    this.#kernel = this.#generateKernel(64);
  }

  shouldRun(ctx: RenderFrameContext): boolean {
    return !!ctx.features.ssao;
  }

  execute(ctx: RenderFrameContext): void {
    const { app, renderer, resources, features, shaders, shared } = ctx;
    const { width, height } = renderer.getDrawableSize();

    resources.ensureSSAO(renderer, width, height);
    if (!resources.ssao || !resources.gbuffer) return;

    const gb = resources.gbuffer;

    shaders.ssao.use();
    gb.positionMetallic.bind(0);
    gb.normalRoughness.bind(1);
    if (this.#noiseTex) this.#noiseTex.bind(9);

    const kernelSize = features.ssaoKernelSize ?? 64;
    shaders.ssao.setUniform1i("uKernelSize", Math.min(kernelSize, 64));
    shaders.ssao.setUniform1f("uRadius", features.ssaoRadius ?? 0.5);
    shaders.ssao.setUniform1f("uBias", features.ssaoBias ?? 0.025);
    this.#noiseScale[0] = width / 4.0;
    this.#noiseScale[1] = height / 4.0;
    shaders.ssao.setUniformVec2("uNoiseScale", this.#noiseScale);

    app.forEachActiveComponent(Camera, (camera) => {
      shaders.ssao.setUniformMat4("uView", camera.viewMatrix);
      shaders.ssao.setUniformMat4("uProjection", camera.glProjectionMatrix);
    });

    for (let i = 0; i < Math.min(kernelSize, 64); i++) {
      shaders.ssao.setUniformVec3(`uSamples[${i}]`, this.#kernel.subarray(i * 3, i * 3 + 3));
    }

    renderer.beginPass({
      target: resources.ssao.rtRaw,
      depthTest: false,
      depthWrite: false,
      blend: { enable: false },
      clearColor: [1, 1, 1, 1],
      viewport: { x: 0, y: 0, w: width, h: height },
    });
    renderer.drawArrays(shared.fullscreenQuad, { mode: "triangle-strip", count: 4 });
    renderer.endPass();

    shaders.ssaoBlur.use();
    resources.ssao.texRaw.bind(0);

    renderer.beginPass({
      target: resources.ssao.rtBlurred,
      depthTest: false,
      depthWrite: false,
      blend: { enable: false },
      clearColor: [1, 1, 1, 1],
      viewport: { x: 0, y: 0, w: width, h: height },
    });
    renderer.drawArrays(shared.fullscreenQuad, { mode: "triangle-strip", count: 4 });
    renderer.endPass();
  }

  #generateKernel(size: number): Float32Array {
    const kernel = new Float32Array(size * 3);
    for (let i = 0; i < size; i++) {
      let x = Math.random() * 2.0 - 1.0;
      let y = Math.random() * 2.0 - 1.0;
      let z = Math.random();
      const len = Math.sqrt(x * x + y * y + z * z);
      x /= len;
      y /= len;
      z /= len;
      let scale = i / size;
      scale = 0.1 + scale * scale * 0.9;
      kernel[i * 3] = x * scale;
      kernel[i * 3 + 1] = y * scale;
      kernel[i * 3 + 2] = z * scale;
    }
    return kernel;
  }

  #createNoiseTex(renderer: RendererBackend): GfxTexture {
    const tex = renderer.createTexture({
      kind: "2d",
      width: 4,
      height: 4,
      format: "rg16f",
      samplerHint: "nearest",
    });
    const noiseData = new Float32Array(4 * 4 * 2);
    for (let i = 0; i < 16; i++) {
      noiseData[i * 2] = Math.random() * 2.0 - 1.0;
      noiseData[i * 2 + 1] = Math.random() * 2.0 - 1.0;
    }
    tex.update2D(f32ArrayToF16(noiseData), { width: 4, height: 4, format: "rg16f" });
    return tex;
  }
}
