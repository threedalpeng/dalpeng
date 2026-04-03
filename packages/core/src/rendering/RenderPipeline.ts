import type Application from "../Application";
import type { RendererBackend } from "../gfx/RendererBackend";
import type GfxBuffer from "../gfx/Buffer";
import type GfxVertexArray from "../gfx/VertexArray";
import { Vec3 } from "@dalpeng/math";
import Camera from "../graphics/Camera";
import Light from "../graphics/Light";
import MeshRenderer from "../graphics/MeshRenderer";
import SkinnedMeshRenderer from "../graphics/SkinnedMeshRenderer";
import ParticleEmitter from "../graphics/ParticleEmitter";
import Shader from "../graphics/Shader";
import DirectionalShadowSystem from "../graphics/shadows/DirectionalShadow";
import SpriteRenderer from "../graphics/SpriteRenderer";
import FrameResources from "./FrameResources";
import PostProcessing from "./PostProcessing";
import { FrameProfiler } from "../debug";

import gbuffrag from "../shaders/g_buf.frag?raw";
import gbufvert from "../shaders/g_buf.vert?raw";
import mainfrag from "../shaders/main.frag?raw";
import mainvert from "../shaders/main.vert?raw";
import { dummyQuadForLight } from "../utils/mesh";
import type GfxTexture from "../gfx/Texture";
import IBLPrecompute from "./IBLPrecompute";
import { f32ArrayToF16 } from "../utils/float16";
import ssaofrag from "../shaders/ssao.frag?raw";
import ssaoblurfrag from "../shaders/ssao_blur.frag?raw";
import skyboxvert from "../shaders/skybox.vert?raw";
import skyboxfrag from "../shaders/skybox.frag?raw";
import fxaafrag from "../shaders/fxaa.frag?raw";

export default class RenderPipeline {
  shader = {
    geometry: new Shader(),
    lighting: new Shader(),
    post: new Shader(),
    shadow: new Shader(),
    bloomBright: new Shader(),
    bloomBlur: new Shader(),
    particle: new Shader(),
    ssao: new Shader(),
    ssaoBlur: new Shader(),
    skybox: new Shader(),
    fxaa: new Shader(),
  };

  lightingQuad!: GfxVertexArray;

  #shadowSys: DirectionalShadowSystem | null = null;
  #postProcessing = new PostProcessing();
  #frameResources = new FrameResources();

  #particleQuadVao: GfxVertexArray | null = null;
  #particleQuadVbo: GfxBuffer | null = null;
  #particleInstanceVbo: GfxBuffer | null = null;

  #iblPrecompute = new IBLPrecompute();
  #iblPending = false;
  #ssaoNoiseTex: GfxTexture | null = null;
  #ssaoKernel: Float32Array = new Float32Array(0);
  #skyboxVao: GfxVertexArray | null = null;
  #skyboxVbo: GfxBuffer | null = null;

  static #IDENTITY_MAT4 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  #cachedAmbientColor = new Vec3([1, 1, 1]);
  #lastAmbientColor: readonly number[] | undefined;
  #ssaoNoiseScale = new Float32Array(2);

  async init(renderer: RendererBackend) {
    this.#shadowSys = new DirectionalShadowSystem();

    for (const s of Object.values(this.shader)) {
      s.bindBackend(renderer);
    }

    await Promise.allSettled([
      this.shader.geometry.loadFrom(gbufvert, gbuffrag),
      this.shader.lighting.loadFrom(mainvert, mainfrag),
      this.shader.post.loadFrom(mainvert, (await import("../shaders/post.frag?raw")).default),
      this.shader.shadow.loadFrom(
        (await import("../shaders/shadow.vert?raw")).default,
        (await import("../shaders/shadow.frag?raw")).default
      ),
    ]);

    await Promise.allSettled([
      this.shader.bloomBright.loadFrom(mainvert, (await import("../shaders/bloom_bright.frag?raw")).default),
      this.shader.bloomBlur.loadFrom(mainvert, (await import("../shaders/bloom_blur.frag?raw")).default),
      this.shader.particle.loadFrom(
        (await import("../shaders/particle.vert?raw")).default,
        (await import("../shaders/particle.frag?raw")).default
      ),
      this.shader.ssao.loadFrom(mainvert, ssaofrag),
      this.shader.ssaoBlur.loadFrom(mainvert, ssaoblurfrag),
      this.shader.skybox.loadFrom(skyboxvert, skyboxfrag),
      this.shader.fxaa.loadFrom(mainvert, fxaafrag),
    ]);

    // Material texture sampler uniforms (texture units are constant)
    this.shader.geometry.use();
    this.shader.geometry.setUniform1i("uBaseColorMap", 0);
    this.shader.geometry.setUniform1i("uNormalMap", 1);
    this.shader.geometry.setUniform1i("uMetallicRoughnessMap", 2);
    this.shader.geometry.setUniform1i("uEmissiveMap", 3);
    this.shader.geometry.setUniform1i("uOcclusionMap", 4);

    // G-Buffer sampler uniforms (texture units are constant)
    this.shader.lighting.use();
    this.shader.lighting.setUniform1i("gPositionMetallic", 0);
    this.shader.lighting.setUniform1i("gNormalRoughness", 1);
    this.shader.lighting.setUniform1i("gAlbedo", 2);
    this.shader.lighting.setUniform1i("gEmissive", 3);
    this.shader.lighting.setUniform1i("uShadowMapDepth", 4);

    // Shared fullscreen quad for lighting pass
    const lightingPosLoc = this.shader.lighting.getAttribLocation("aPosition");
    this.lightingQuad = renderer.createVertexArray();
    const lightingQuadBuf = renderer.createBuffer("vertex");
    lightingQuadBuf.update(dummyQuadForLight());
    this.lightingQuad.setVertexBuffer(lightingPosLoc, lightingQuadBuf, 3);

    // SSAO sampler uniforms
    this.shader.ssao.use();
    this.shader.ssao.setUniform1i("gPositionMetallic", 0);
    this.shader.ssao.setUniform1i("gNormalRoughness", 1);
    this.shader.ssao.setUniform1i("uNoiseTex", 9);

    // SSAO blur sampler uniform
    this.shader.ssaoBlur.use();
    this.shader.ssaoBlur.setUniform1i("uSSAORaw", 0);

    // Lighting shader IBL/SSAO sampler uniforms
    this.shader.lighting.use();
    this.shader.lighting.setUniform1i("uSSAOMap", 5);
    this.shader.lighting.setUniform1i("uIrradianceMap", 6);
    this.shader.lighting.setUniform1i("uPrefilteredMap", 7);
    this.shader.lighting.setUniform1i("uBrdfLUT", 8);

    // Skybox sampler uniform
    this.shader.skybox.use();
    this.shader.skybox.setUniform1i("uSkybox", 0);

    // FXAA sampler uniform
    this.shader.fxaa.use();
    this.shader.fxaa.setUniform1i("uSource", 0);

    // Generate SSAO noise texture and kernel
    this.#ssaoNoiseTex = this.#createSSAONoiseTex(renderer);
    this.#ssaoKernel = this.#generateSSAOKernel(64);
  }

  async initIBL(renderer: RendererBackend, hdrUrl: string): Promise<void> {
    await this.#iblPrecompute.precompute(renderer, hdrUrl);
  }

  render(app: Application) {
    const renderer = app.renderer;
    const features = app.features;
    const resources = this.#frameResources;

    const { width, height } = renderer.getDrawableSize();
    resources.ensureSize(renderer, width, height);
    renderer.setViewport(0, 0, width, height);

    // Lazy IBL precompute (if features set after mount)
    if (features.ibl && features.iblHdrUrl && !this.#iblPrecompute.resources && !this.#iblPending) {
      this.#iblPending = true;
      this.initIBL(renderer, features.iblHdrUrl).then(() => { this.#iblPending = false; });
    }

    // Shadow pass
    FrameProfiler.beginPass("shadow");
    this.#shadowSys?.update(app, resources);
    FrameProfiler.endPass();

    // ─── Geometry pass ───
    FrameProfiler.beginPass("geometry");
    this.shader.geometry.use();
    renderer.beginPass({
      target: resources.gbuffer!.rt,
      depthTest: true,
      depthWrite: true,
      blend: { enable: false },
      clearColor: [0, 0, 0, 0],
      clearDepth: 1,
      colorAttachments: [0, 1, 2, 3],
      viewport: { x: 0, y: 0, w: width, h: height },
    });
    if (features.debugGLVerbose) {
      renderer.debugDumpState?.("after geometry beginPass");
      renderer.debugCheckError?.("after geometry beginPass");
    }

    app.forEachActiveComponent(Camera, (camera) => {
      camera.renderCameraToGeometry();
    });
    app.forEachActiveComponent(MeshRenderer, (r) => {
      r.render();
    });
    app.forEachActiveComponent(SkinnedMeshRenderer, (r) => {
      r.render();
    });
    app.forEachActiveComponent(SpriteRenderer, (r) => {
      r.render();
    });
    renderer.endPass();
    FrameProfiler.endPass();
    if (features.debugGLVerbose) renderer.debugCheckError?.("after geometry endPass");

    // ─── SSAO pass ───
    if (features.ssao) {
      FrameProfiler.beginPass("ssao");
      this.#renderSSAO(app, resources);
      FrameProfiler.endPass();
    }

    // ─── Lighting pass ───
    FrameProfiler.beginPass("lighting");
    this.shader.lighting.use();

    // Bind G-Buffer textures to units 0..3
    const gb = resources.gbuffer!;
    gb.positionMetallic.bind(0);
    gb.normalRoughness.bind(1);
    gb.albedo.bind(2);
    gb.emissive.bind(3);

    // Bind IBL textures
    const iblRes = this.#iblPrecompute.resources;
    if (features.ibl && iblRes) {
      iblRes.irradianceCubemap.bind(6);
      iblRes.prefilteredCubemap.bind(7);
      iblRes.brdfLUT.bind(8);
      this.shader.lighting.setUniform1i("uEnableIBL", 1);
      this.shader.lighting.setUniform1f("uIBLIntensity", features.iblIntensity ?? 1.0);
    } else {
      this.shader.lighting.setUniform1i("uEnableIBL", 0);
    }

    // Bind SSAO blurred result
    if (features.ssao && resources.ssao) {
      resources.ssao.texBlurred.bind(5);
      this.shader.lighting.setUniform1i("uEnableSSAO", 1);
    } else {
      this.shader.lighting.setUniform1i("uEnableSSAO", 0);
    }

    renderer.beginPass({
      target: resources.lighting!.rt,
      depthTest: false,
      depthWrite: false,
      blend: { enable: true, mode: "additive" },
      clearColor: [0, 0, 0, 0],
      colorAttachments: [0],
    });
    if (features.debugGLVerbose) {
      renderer.debugDumpState?.("after lighting beginPass");
      renderer.debugCheckError?.("after lighting beginPass");
    }

    this.shader.lighting.setUniform1i("uApplyGamma", 0);
    this.shader.lighting.setUniform1f("uGamma", features.toneGamma ?? 2.2);
    this.shader.lighting.setUniform1i("uDebugMode", features.debugLightingView ?? 0);
    this.shader.lighting.setUniform1i("uShadowDebug", features.shadowDebug ?? 0);
    const ambientSrc = features.ambientColor ?? [1, 1, 1];
    if (ambientSrc !== this.#lastAmbientColor) {
      this.#cachedAmbientColor = new Vec3(ambientSrc);
      this.#lastAmbientColor = ambientSrc;
    }
    this.shader.lighting.setUniformVec3("uAmbientColor", this.#cachedAmbientColor);
    this.shader.lighting.setUniform1f("uAmbientIntensity", features.ambientIntensity ?? 0.01);

    app.forEachActiveComponent(Camera, (camera) => {
      camera.renderCameraToLighting();
    });
    let isFirstLight = true;
    app.forEachActiveComponent(Light, (light) => {
      this.shader.lighting.setUniform1i("uIsFirstLight", isFirstLight ? 1 : 0);
      isFirstLight = false;
      this.#shadowSys?.bindForLight(app, light, resources);
      light.renderLight();
    });

    // If no lights exist, still draw one ambient+emissive pass
    if (isFirstLight) {
      this.shader.lighting.setUniform1i("uIsFirstLight", 1);
      this.shader.lighting.setUniform1i("uLight.type", 0);
      this.shader.lighting.setUniform1f("uLight.intensity", 0);
      this.shader.lighting.setUniform1f("uShadowStrength", 0);
      renderer.drawArrays(this.lightingQuad, {
        mode: "triangle-strip",
        count: 4,
        first: 0,
      });
    }

    if (features.debugGLVerbose) {
      renderer.debugDumpState?.("after lights");
      renderer.debugCheckError?.("after lights");
    }

    renderer.endPass();
    FrameProfiler.endPass();
    if (features.debugGLVerbose) renderer.debugCheckError?.("after lighting endPass");

    // ─── Skybox pass ───
    if ((features.skybox ?? features.ibl) && this.#iblPrecompute.resources) {
      FrameProfiler.beginPass("skybox");
      this.#renderSkybox(app, resources);
      FrameProfiler.endPass();
    }

    // ─── Particle forward pass ───
    FrameProfiler.beginPass("particles");
    this.#renderParticles(app);
    FrameProfiler.endPass();

    // ─── Bloom allocation ───
    if (features.bloom) {
      resources.ensureBloom(renderer);
    }

    // ─── FXAA allocation ───
    if (features.fxaa) {
      resources.ensureFxaa(renderer);
    }

    // ─── Post-processing ───
    FrameProfiler.beginPass("post");
    this.#postProcessing.render(renderer, resources, {
      post: this.shader.post,
      bloomBright: this.shader.bloomBright,
      bloomBlur: this.shader.bloomBlur,
      fxaa: this.shader.fxaa,
    }, features);
    FrameProfiler.endPass();
  }

  #renderParticles(app: Application) {
    const renderer = app.renderer;
    const resources = this.#frameResources;
    if (!resources.lighting) return;

    let hasParticles = false;
    app.forEachActiveComponent(ParticleEmitter, (emitter) => {
      if (emitter.aliveCount > 0) hasParticles = true;
    });
    if (!hasParticles) return;

    renderer.beginPass({
      target: resources.lighting.rt,
      depthTest: true,
      depthWrite: false,
      blend: { enable: true, mode: "premultiplied-additive" },
      colorAttachments: [0],
    });
    renderer.setCullFace?.(false);

    const particleShader = this.shader.particle;
    particleShader.use();
    app.forEachActiveComponent(Camera, (camera) => {
      particleShader.setUniformMat4("uView", camera.viewMatrix);
      particleShader.setUniformMat4("uProjection", camera.glProjectionMatrix);
    });

    // Lazy-init shared particle quad VAO
    if (!this.#particleQuadVao) {
      this.#particleQuadVao = renderer.createVertexArray();
      this.#particleQuadVbo = renderer.createBuffer("vertex");
      this.#particleQuadVbo.update(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
      const posLoc = particleShader.getAttribLocation("aPosition");
      this.#particleQuadVao.setVertexBuffer(posLoc, this.#particleQuadVbo!, 2);
      this.#particleInstanceVbo = renderer.createBuffer("vertex");
    }

    app.forEachActiveComponent(ParticleEmitter, (emitter) => {
      const count = emitter.aliveCount;
      if (count === 0) return;

      this.#particleInstanceVbo!.update(emitter.instanceData.subarray(0, count * 8));

      const posSizeLoc = particleShader.getAttribLocation("aInstancePosSize");
      const colorLoc = particleShader.getAttribLocation("aInstanceColor");
      this.#particleQuadVao!.setVertexBufferInstanced?.(
        posSizeLoc, this.#particleInstanceVbo!, 4, 1, { stride: 32, offset: 0 }
      );
      this.#particleQuadVao!.setVertexBufferInstanced?.(
        colorLoc, this.#particleInstanceVbo!, 4, 1, { stride: 32, offset: 16 }
      );

      particleShader.setUniformMat4("uModel", RenderPipeline.#IDENTITY_MAT4);

      renderer.drawArraysInstanced?.(this.#particleQuadVao!, {
        mode: "triangle-strip",
        count: 4,
        instanceCount: count,
      });
    });

    renderer.setCullFace?.(true);
    renderer.endPass();
  }

  #renderSSAO(app: Application, resources: FrameResources): void {
    const renderer = app.renderer;
    const features = app.features;
    const { width, height } = renderer.getDrawableSize();

    resources.ensureSSAO(renderer, width, height);
    if (!resources.ssao || !resources.gbuffer) return;

    const gb = resources.gbuffer;

    // ── SSAO raw pass ──
    this.shader.ssao.use();
    gb.positionMetallic.bind(0);
    gb.normalRoughness.bind(1);
    if (this.#ssaoNoiseTex) this.#ssaoNoiseTex.bind(9);

    // Set kernel samples
    const kernelSize = features.ssaoKernelSize ?? 64;
    this.shader.ssao.setUniform1i("uKernelSize", Math.min(kernelSize, 64));
    this.shader.ssao.setUniform1f("uRadius", features.ssaoRadius ?? 0.5);
    this.shader.ssao.setUniform1f("uBias", features.ssaoBias ?? 0.025);
    this.#ssaoNoiseScale[0] = width / 4.0;
    this.#ssaoNoiseScale[1] = height / 4.0;
    this.shader.ssao.setUniformVec2("uNoiseScale", this.#ssaoNoiseScale);

    // Set view/projection from camera
    app.forEachActiveComponent(Camera, (camera) => {
      this.shader.ssao.setUniformMat4("uView", camera.viewMatrix);
      this.shader.ssao.setUniformMat4("uProjection", camera.glProjectionMatrix);
    });

    // Upload kernel samples as individual vec3 uniforms
    for (let i = 0; i < Math.min(kernelSize, 64); i++) {
      this.shader.ssao.setUniformVec3(
        `uSamples[${i}]`,
        this.#ssaoKernel.subarray(i * 3, i * 3 + 3)
      );
    }

    renderer.beginPass({
      target: resources.ssao.rtRaw,
      depthTest: false,
      depthWrite: false,
      blend: { enable: false },
      clearColor: [1, 1, 1, 1],
      viewport: { x: 0, y: 0, w: width, h: height },
    });
    renderer.drawArrays(this.lightingQuad, { mode: "triangle-strip", count: 4 });
    renderer.endPass();

    // ── SSAO blur pass ──
    this.shader.ssaoBlur.use();
    resources.ssao.texRaw.bind(0);

    renderer.beginPass({
      target: resources.ssao.rtBlurred,
      depthTest: false,
      depthWrite: false,
      blend: { enable: false },
      clearColor: [1, 1, 1, 1],
      viewport: { x: 0, y: 0, w: width, h: height },
    });
    renderer.drawArrays(this.lightingQuad, { mode: "triangle-strip", count: 4 });
    renderer.endPass();
  }

  #renderSkybox(app: Application, resources: FrameResources): void {
    const renderer = app.renderer;
    const features = app.features;
    const iblRes = this.#iblPrecompute.resources;
    if (!iblRes || !resources.lighting) return;

    // Lazy-init skybox cube VAO
    if (!this.#skyboxVao) {
      this.#skyboxVao = renderer.createVertexArray();
      this.#skyboxVbo = renderer.createBuffer("vertex");
      // Unit cube: 36 vertices
      // prettier-ignore
      this.#skyboxVbo.update(new Float32Array([
        -1,-1,-1,  1, 1,-1,  1,-1,-1,  -1,-1,-1, -1, 1,-1,  1, 1,-1,
        -1,-1, 1,  1,-1, 1,  1, 1, 1,  -1,-1, 1,  1, 1, 1, -1, 1, 1,
        -1,-1,-1, -1,-1, 1, -1, 1, 1,  -1,-1,-1, -1, 1, 1, -1, 1,-1,
         1,-1, 1,  1,-1,-1,  1, 1,-1,   1,-1, 1,  1, 1,-1,  1, 1, 1,
        -1,-1,-1,  1,-1,-1,  1,-1, 1,  -1,-1,-1,  1,-1, 1, -1,-1, 1,
        -1, 1, 1,  1, 1, 1,  1, 1,-1,  -1, 1, 1,  1, 1,-1, -1, 1,-1,
      ]));
      const posLoc = this.shader.skybox.getAttribLocation("aPosition");
      this.#skyboxVao.setVertexBuffer(posLoc, this.#skyboxVbo!, 3);
    }

    this.shader.skybox.use();
    iblRes.envCubemap.bind(0);

    app.forEachActiveComponent(Camera, (camera) => {
      this.shader.skybox.setUniformMat4("uView", camera.viewMatrix);
      this.shader.skybox.setUniformMat4("uProjection", camera.glProjectionMatrix);
    });
    this.shader.skybox.setUniform1f("uExposure", features.skyboxExposure ?? features.toneExposure ?? 1.0);

    renderer.beginPass({
      target: resources.lighting.rt,
      depthTest: true,
      depthWrite: false,
      blend: { enable: false },
    });
    renderer.setCullFace?.(false);
    renderer.drawArrays(this.#skyboxVao, { mode: "triangles", count: 36 });
    renderer.setCullFace?.(true);
    renderer.endPass();
  }

  #generateSSAOKernel(size: number): Float32Array {
    const kernel = new Float32Array(size * 3);
    for (let i = 0; i < size; i++) {
      // Random point in hemisphere (tangent space, z-up)
      let x = Math.random() * 2.0 - 1.0;
      let y = Math.random() * 2.0 - 1.0;
      let z = Math.random(); // hemisphere: z >= 0

      // Normalize
      const len = Math.sqrt(x * x + y * y + z * z);
      x /= len; y /= len; z /= len;

      // Scale to distribute more samples closer to origin
      let scale = i / size;
      scale = 0.1 + scale * scale * 0.9; // lerp(0.1, 1.0, scale^2)
      x *= scale; y *= scale; z *= scale;

      kernel[i * 3] = x;
      kernel[i * 3 + 1] = y;
      kernel[i * 3 + 2] = z;
    }
    return kernel;
  }

  #createSSAONoiseTex(renderer: RendererBackend): GfxTexture {
    const tex = renderer.createTexture({
      kind: "2d",
      width: 4,
      height: 4,
      format: "rg16f",
      samplerHint: "nearest",
    });
    // 4x4 random tangent-space rotation vectors (only XY needed)
    const noiseData = new Float32Array(4 * 4 * 2);
    for (let i = 0; i < 16; i++) {
      noiseData[i * 2] = Math.random() * 2.0 - 1.0;
      noiseData[i * 2 + 1] = Math.random() * 2.0 - 1.0;
    }
    tex.update2D(f32ArrayToF16(noiseData), { width: 4, height: 4, format: "rg16f" });
    return tex;
  }
}
