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
import sprite2dvert from "../shaders/sprite2d.vert?raw";
import sprite2dfrag from "../shaders/sprite2d.frag?raw";
import blitvert from "../shaders/blit.vert?raw";
import blitfrag from "../shaders/blit.frag?raw";
import Sprite2DRenderer from "../graphics2d/Sprite2DRenderer";
import CameraFollow2D from "../graphics2d/CameraFollow2D";
import TilemapRenderer, { type TilemapLayerBatch } from "../graphics2d/TilemapRenderer";
import { Mat4 } from "@dalpeng/math";

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
    sprite2d: new Shader(),
    blit: new Shader(),
  };

  lightingQuad!: GfxVertexArray;

  #shadowSys: DirectionalShadowSystem | null = null;
  #postProcessing = new PostProcessing();
  #frameResources = new FrameResources();

  #particleQuadVao: GfxVertexArray | null = null;
  #particleQuadVbo: GfxBuffer | null = null;
  #particleInstanceVbo: GfxBuffer | null = null;

  #sprite2dQuadVao: GfxVertexArray | null = null;
  #sprite2dQuadVbo: GfxBuffer | null = null;
  #sprite2dInstanceVbo: GfxBuffer | null = null;
  #sprite2dInstanceBuf = new Float32Array(0);

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
      this.shader.sprite2d.loadFrom(sprite2dvert, sprite2dfrag),
      this.shader.blit.loadFrom(blitvert, blitfrag),
    ]);

    this.shader.geometry.use();
    this.shader.geometry.setUniform1i("uBaseColorMap", 0);
    this.shader.geometry.setUniform1i("uNormalMap", 1);
    this.shader.geometry.setUniform1i("uMetallicRoughnessMap", 2);
    this.shader.geometry.setUniform1i("uEmissiveMap", 3);
    this.shader.geometry.setUniform1i("uOcclusionMap", 4);

    this.shader.lighting.use();
    this.shader.lighting.setUniform1i("gPositionMetallic", 0);
    this.shader.lighting.setUniform1i("gNormalRoughness", 1);
    this.shader.lighting.setUniform1i("gAlbedo", 2);
    this.shader.lighting.setUniform1i("gEmissive", 3);
    this.shader.lighting.setUniform1i("uShadowMapDepth", 4);

    const lightingPosLoc = this.shader.lighting.getAttribLocation("aPosition");
    this.lightingQuad = renderer.createVertexArray();
    const lightingQuadBuf = renderer.createBuffer("vertex");
    lightingQuadBuf.update(dummyQuadForLight());
    this.lightingQuad.setVertexBuffer(lightingPosLoc, lightingQuadBuf, 3);

    this.shader.ssao.use();
    this.shader.ssao.setUniform1i("gPositionMetallic", 0);
    this.shader.ssao.setUniform1i("gNormalRoughness", 1);
    this.shader.ssao.setUniform1i("uNoiseTex", 9);

    this.shader.ssaoBlur.use();
    this.shader.ssaoBlur.setUniform1i("uSSAORaw", 0);

    this.shader.lighting.use();
    this.shader.lighting.setUniform1i("uSSAOMap", 5);
    this.shader.lighting.setUniform1i("uIrradianceMap", 6);
    this.shader.lighting.setUniform1i("uPrefilteredMap", 7);
    this.shader.lighting.setUniform1i("uBrdfLUT", 8);

    this.shader.skybox.use();
    this.shader.skybox.setUniform1i("uSkybox", 0);

    this.shader.fxaa.use();
    this.shader.fxaa.setUniform1i("uSource", 0);

    this.shader.sprite2d.use();
    this.shader.sprite2d.setUniform1i("uAtlas", 0);

    this.shader.blit.use();
    this.shader.blit.setUniform1i("uSource", 0);

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

    if (features.ibl && features.iblHdrUrl && !this.#iblPrecompute.resources && !this.#iblPending) {
      this.#iblPending = true;
      this.initIBL(renderer, features.iblHdrUrl).then(() => { this.#iblPending = false; });
    }

    FrameProfiler.beginPass("shadow");
    this.#shadowSys?.update(app, resources);
    FrameProfiler.endPass();
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
    if (features.ssao) {
      FrameProfiler.beginPass("ssao");
      this.#renderSSAO(app, resources);
      FrameProfiler.endPass();
    }
    FrameProfiler.beginPass("lighting");
    this.shader.lighting.use();

    const gb = resources.gbuffer!;
    gb.positionMetallic.bind(0);
    gb.normalRoughness.bind(1);
    gb.albedo.bind(2);
    gb.emissive.bind(3);

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
    if ((features.skybox ?? features.ibl) && this.#iblPrecompute.resources) {
      FrameProfiler.beginPass("skybox");
      this.#renderSkybox(app, resources);
      FrameProfiler.endPass();
    }
    // FBO dimensions must be exact multiples of tile size to keep 1 unit = ppu pixels.
    // Height is fixed from camera.size * 2 * ppu (always integer).
    // Width is rounded to nearest integer; the 2D projection is then derived FROM the FBO size.
    {
      let pixelArtWidth = 0, pixelArtHeight = 0;
      app.forEachActiveComponent(Camera, (camera) => {
        if (camera.isOrthographic) {
          let ppu = 16;
          app.forEachActiveComponent(CameraFollow2D, (cf) => { ppu = cf.pixelsPerUnit; });
          pixelArtHeight = Math.round(camera.size * 2 * ppu);
          pixelArtWidth = Math.round(pixelArtHeight * camera.aspectRatio);
        }
      });
      if (pixelArtWidth > 0 && pixelArtHeight > 0) {
        resources.ensurePixelArt(renderer, pixelArtWidth, pixelArtHeight);
      }
    }
    if (resources.pixelArt) {
      renderer.beginPass({
        target: resources.pixelArt.rt,
        depthTest: false,
        depthWrite: false,
        blend: { enable: false },
        clearColor: [0, 0, 0, 0],
        viewport: { x: 0, y: 0, w: resources.pixelArt.width, h: resources.pixelArt.height },
        colorAttachments: [0],
      });
      renderer.endPass();
    }
    FrameProfiler.beginPass("tilemap2d");
    this.#renderTilemap(app);
    FrameProfiler.endPass();
    FrameProfiler.beginPass("sprites2d");
    this.#render2DSprites(app);
    FrameProfiler.endPass();
    if (resources.pixelArt && resources.lighting) {
      this.#blitPixelArt(app, resources);
    }
    FrameProfiler.beginPass("particles");
    this.#renderParticles(app);
    FrameProfiler.endPass();
    if (features.bloom) {
      resources.ensureBloom(renderer);
    }
    if (features.fxaa) {
      resources.ensureFxaa(renderer);
    }
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

    this.shader.ssao.use();
    gb.positionMetallic.bind(0);
    gb.normalRoughness.bind(1);
    if (this.#ssaoNoiseTex) this.#ssaoNoiseTex.bind(9);

    const kernelSize = features.ssaoKernelSize ?? 64;
    this.shader.ssao.setUniform1i("uKernelSize", Math.min(kernelSize, 64));
    this.shader.ssao.setUniform1f("uRadius", features.ssaoRadius ?? 0.5);
    this.shader.ssao.setUniform1f("uBias", features.ssaoBias ?? 0.025);
    this.#ssaoNoiseScale[0] = width / 4.0;
    this.#ssaoNoiseScale[1] = height / 4.0;
    this.shader.ssao.setUniformVec2("uNoiseScale", this.#ssaoNoiseScale);

    app.forEachActiveComponent(Camera, (camera) => {
      this.shader.ssao.setUniformMat4("uView", camera.viewMatrix);
      this.shader.ssao.setUniformMat4("uProjection", camera.glProjectionMatrix);
    });

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

  #renderTilemap(app: Application) {
    const renderer = app.renderer;
    const resources = this.#frameResources;
    if (!resources.pixelArt) return;

    const batches: TilemapLayerBatch[] = [];
    app.forEachActiveComponent(TilemapRenderer, (tmr) => {
      batches.push(...tmr.layerBatches);
    });
    if (batches.length === 0) return;

    const viewProj = this.#get2DViewProjection(app);
    if (!viewProj) return;

    // Reuse sprite2d shader and quad VAO for tilemap rendering
    if (!this.#sprite2dQuadVao) {
      this.#sprite2dQuadVao = renderer.createVertexArray();
      this.#sprite2dQuadVbo = renderer.createBuffer("vertex");
      this.#sprite2dQuadVbo.update(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
      const posLoc = this.shader.sprite2d.getAttribLocation("aPosition");
      this.#sprite2dQuadVao.setVertexBuffer(posLoc, this.#sprite2dQuadVbo!, 2);
      this.#sprite2dInstanceVbo = renderer.createBuffer("vertex");
    }

    this.shader.sprite2d.use();
    this.shader.sprite2d.setUniformMat4("uViewProjection", viewProj);

    renderer.beginPass({
      target: resources.pixelArt!.rt,
      depthTest: false,
      depthWrite: false,
      blend: { enable: true, mode: "alpha" },
      colorAttachments: [0],
      viewport: { x: 0, y: 0, w: resources.pixelArt!.width, h: resources.pixelArt!.height },
    });
    renderer.setCullFace?.(false);

    const stride = 14 * 4; // 56 bytes
    for (const batch of batches) {
      this.#sprite2dInstanceVbo!.update(batch.instanceData);

      const posLoc = this.shader.sprite2d.getAttribLocation("aInstPos");
      const sizeLoc = this.shader.sprite2d.getAttribLocation("aInstSize");
      const uvLoc = this.shader.sprite2d.getAttribLocation("aInstUV");
      const tintLoc = this.shader.sprite2d.getAttribLocation("aInstTint");
      const depthLoc = this.shader.sprite2d.getAttribLocation("aInstDepth");

      this.#sprite2dQuadVao!.setVertexBufferInstanced?.(posLoc, this.#sprite2dInstanceVbo!, 2, 1, { stride, offset: 0 });
      this.#sprite2dQuadVao!.setVertexBufferInstanced?.(sizeLoc, this.#sprite2dInstanceVbo!, 2, 1, { stride, offset: 8 });
      this.#sprite2dQuadVao!.setVertexBufferInstanced?.(uvLoc, this.#sprite2dInstanceVbo!, 4, 1, { stride, offset: 16 });
      this.#sprite2dQuadVao!.setVertexBufferInstanced?.(tintLoc, this.#sprite2dInstanceVbo!, 4, 1, { stride, offset: 32 });
      this.#sprite2dQuadVao!.setVertexBufferInstanced?.(depthLoc, this.#sprite2dInstanceVbo!, 1, 1, { stride, offset: 48 });

      batch.atlas.texture.bind(0);

      renderer.drawArraysInstanced?.(this.#sprite2dQuadVao!, {
        mode: "triangle-strip",
        count: 4,
        instanceCount: batch.tileCount,
      });
    }

    renderer.setCullFace?.(true);
    renderer.endPass();
  }

  #get2DViewProjection(app: Application): Mat4 | null {
    const pa = this.#frameResources.pixelArt;
    if (!pa) return null;

    let viewProj: Mat4 | null = null;
    app.forEachActiveComponent(Camera, (camera) => {
      if (camera.isOrthographic) {
        let viewMatrix = camera.viewMatrix;
        let ppu = 16;
        app.forEachActiveComponent(CameraFollow2D, (cf) => {
          ppu = cf.pixelsPerUnit;
          if (cf.snappedViewMatrix) {
            viewMatrix = cf.snappedViewMatrix;
          }
        });

        // Build projection from FBO dimensions so 1 world unit = exactly ppu pixels
        const halfW = pa.width / ppu / 2;
        const halfH = pa.height / ppu / 2;
        const proj = Mat4.toWebGL(
          Mat4.orthographic(halfW, halfH, camera.dNear, camera.dFar)
        );
        viewProj = proj.mul(viewMatrix);
      }
    });
    return viewProj;
  }

  #render2DSprites(app: Application) {
    const renderer = app.renderer;
    const resources = this.#frameResources;
    if (!resources.pixelArt) return;

    const sprites: { renderer: Sprite2DRenderer; sortKey: number }[] = [];
    app.forEachActiveComponent(Sprite2DRenderer, (s) => {
      if (!s.atlas) return;
      const layerName = s.gameEntity._layerName;
      const layerIndex = layerName
        ? (app.layers.get(layerName)?.index ?? s.sortingLayer)
        : s.sortingLayer;
      sprites.push({ renderer: s, sortKey: s.getSortKey(layerIndex) });
    });
    if (sprites.length === 0) return;

    sprites.sort((a, b) => a.sortKey - b.sortKey);

    const floatsPerSprite = 14;
    const totalFloats = sprites.length * floatsPerSprite;
    if (this.#sprite2dInstanceBuf.length < totalFloats) {
      this.#sprite2dInstanceBuf = new Float32Array(totalFloats);
    }
    for (let i = 0; i < sprites.length; i++) {
      sprites[i].renderer.writeInstanceData(
        this.#sprite2dInstanceBuf,
        i * floatsPerSprite,
      );
    }

    if (!this.#sprite2dQuadVao) {
      this.#sprite2dQuadVao = renderer.createVertexArray();
      this.#sprite2dQuadVbo = renderer.createBuffer("vertex");
      this.#sprite2dQuadVbo.update(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
      const posLoc = this.shader.sprite2d.getAttribLocation("aPosition");
      this.#sprite2dQuadVao.setVertexBuffer(posLoc, this.#sprite2dQuadVbo!, 2);
      this.#sprite2dInstanceVbo = renderer.createBuffer("vertex");
    }

    const viewProj = this.#get2DViewProjection(app);
    if (!viewProj) return;

    this.shader.sprite2d.use();
    this.shader.sprite2d.setUniformMat4("uViewProjection", viewProj);

    renderer.beginPass({
      target: resources.pixelArt!.rt,
      depthTest: false,
      depthWrite: false,
      blend: { enable: true, mode: "alpha" },
      colorAttachments: [0],
      viewport: { x: 0, y: 0, w: resources.pixelArt!.width, h: resources.pixelArt!.height },
    });
    renderer.setCullFace?.(false);

    let batchStart = 0;
    while (batchStart < sprites.length) {
      const currentAtlas = sprites[batchStart].renderer.atlas!;
      let batchEnd = batchStart + 1;
      while (batchEnd < sprites.length && sprites[batchEnd].renderer.atlas === currentAtlas) {
        batchEnd++;
      }

      const batchCount = batchEnd - batchStart;
      const batchOffset = batchStart * floatsPerSprite;
      const batchData = this.#sprite2dInstanceBuf.subarray(
        batchOffset,
        batchOffset + batchCount * floatsPerSprite
      );

      this.#sprite2dInstanceVbo!.update(batchData);

      const stride = floatsPerSprite * 4; // 56 bytes = 14 floats * 4
      const posLoc = this.shader.sprite2d.getAttribLocation("aInstPos");
      const sizeLoc = this.shader.sprite2d.getAttribLocation("aInstSize");
      const uvLoc = this.shader.sprite2d.getAttribLocation("aInstUV");
      const tintLoc = this.shader.sprite2d.getAttribLocation("aInstTint");
      const depthLoc = this.shader.sprite2d.getAttribLocation("aInstDepth");

      this.#sprite2dQuadVao!.setVertexBufferInstanced?.(posLoc, this.#sprite2dInstanceVbo!, 2, 1, { stride, offset: 0 });
      this.#sprite2dQuadVao!.setVertexBufferInstanced?.(sizeLoc, this.#sprite2dInstanceVbo!, 2, 1, { stride, offset: 8 });
      this.#sprite2dQuadVao!.setVertexBufferInstanced?.(uvLoc, this.#sprite2dInstanceVbo!, 4, 1, { stride, offset: 16 });
      this.#sprite2dQuadVao!.setVertexBufferInstanced?.(tintLoc, this.#sprite2dInstanceVbo!, 4, 1, { stride, offset: 32 });
      this.#sprite2dQuadVao!.setVertexBufferInstanced?.(depthLoc, this.#sprite2dInstanceVbo!, 1, 1, { stride, offset: 48 });

      currentAtlas.texture.bind(0);

      renderer.drawArraysInstanced?.(this.#sprite2dQuadVao!, {
        mode: "triangle-strip",
        count: 4,
        instanceCount: batchCount,
      });

      batchStart = batchEnd;
    }

    renderer.setCullFace?.(true);
    renderer.endPass();
  }

  #blitQuadVao: GfxVertexArray | null = null;
  #blitQuadVbo: GfxBuffer | null = null;

  #blitPixelArt(app: Application, resources: FrameResources): void {
    const renderer = app.renderer;
    const pa = resources.pixelArt!;
    const lt = resources.lighting!;

    // Lazy-init fullscreen quad VAO for blit
    if (!this.#blitQuadVao) {
      this.#blitQuadVao = renderer.createVertexArray();
      this.#blitQuadVbo = renderer.createBuffer("vertex");
      this.#blitQuadVbo.update(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
      const posLoc = this.shader.blit.getAttribLocation("aPosition");
      this.#blitQuadVao.setVertexBuffer(posLoc, this.#blitQuadVbo!, 2);
    }

    const { width, height } = renderer.getDrawableSize();

    // Integer scale to avoid uneven pixel sizes
    const scaleX = Math.max(1, Math.floor(width / pa.width));
    const scaleY = Math.max(1, Math.floor(height / pa.height));
    const scale = Math.min(scaleX, scaleY);
    const blitW = pa.width * scale;
    const blitH = pa.height * scale;

    // Sub-pixel compensation: shift blit quad by the camera's snap remainder
    // This restores smooth motion that was lost by snapping the camera in the FBO
    let subPixelOffsetX = 0;
    let subPixelOffsetY = 0;
    app.forEachActiveComponent(CameraFollow2D, (cf) => {
      if (cf.pixelPerfect) {
        subPixelOffsetX = cf.subPixelX * cf.pixelsPerUnit * scale;
        subPixelOffsetY = cf.subPixelY * cf.pixelsPerUnit * scale;
      }
    });

    const offsetX = Math.round((width - blitW) / 2 - subPixelOffsetX);
    const offsetY = Math.round((height - blitH) / 2 - subPixelOffsetY);

    this.shader.blit.use();
    pa.color.bind(0);

    renderer.beginPass({
      target: lt.rt,
      depthTest: false,
      depthWrite: false,
      blend: { enable: true, mode: "alpha" },
      colorAttachments: [0],
      viewport: { x: offsetX, y: offsetY, w: blitW, h: blitH },
    });
    renderer.drawArrays(this.#blitQuadVao, { mode: "triangle-strip", count: 4 });
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
