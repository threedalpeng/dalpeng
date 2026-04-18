import { Vec3 } from "@dalpeng/math";
import Camera from "../../graphics/Camera";
import Light from "../../graphics/Light";
import type { RenderFrameContext, RenderInitContext, RenderPass } from "./RenderPass";
import type ShadowPass from "./ShadowPass";

export default class LightingPass implements RenderPass {
  readonly name = "lighting";

  #cachedAmbientColor = new Vec3([1, 1, 1]);
  #lastAmbientColor: readonly number[] | undefined;
  #shadow: ShadowPass | null = null;

  init(ctx: RenderInitContext): void {
    const s = ctx.shaders.lighting;
    s.use();
    s.setUniform1i("gPositionMetallic", 0);
    s.setUniform1i("gNormalRoughness", 1);
    s.setUniform1i("gAlbedo", 2);
    s.setUniform1i("gEmissive", 3);
    s.setUniform1i("uShadowMapDepth", 4);
    s.setUniform1i("uSSAOMap", 5);
    s.setUniform1i("uIrradianceMap", 6);
    s.setUniform1i("uPrefilteredMap", 7);
    s.setUniform1i("uBrdfLUT", 8);

    this.#shadow = ctx.pipeline.getPass<ShadowPass>("shadow");
  }

  execute(ctx: RenderFrameContext): void {
    const { app, renderer, resources, features, shaders, shared } = ctx;
    shaders.lighting.use();

    const gb = resources.gbuffer!;
    gb.positionMetallic.bind(0);
    gb.normalRoughness.bind(1);
    gb.albedo.bind(2);
    gb.emissive.bind(3);

    const iblRes = shared.iblPrecompute.resources;
    if (features.ibl && iblRes) {
      iblRes.irradianceCubemap.bind(6);
      iblRes.prefilteredCubemap.bind(7);
      iblRes.brdfLUT.bind(8);
      shaders.lighting.setUniform1i("uEnableIBL", 1);
      shaders.lighting.setUniform1f("uIBLIntensity", features.iblIntensity ?? 1.0);
    } else {
      shaders.lighting.setUniform1i("uEnableIBL", 0);
    }

    if (features.ssao && resources.ssao) {
      resources.ssao.texBlurred.bind(5);
      shaders.lighting.setUniform1i("uEnableSSAO", 1);
    } else {
      shaders.lighting.setUniform1i("uEnableSSAO", 0);
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

    shaders.lighting.setUniform1i("uApplyGamma", 0);
    shaders.lighting.setUniform1f("uGamma", features.toneGamma ?? 2.2);
    shaders.lighting.setUniform1i("uDebugMode", features.debugLightingView ?? 0);
    shaders.lighting.setUniform1i("uShadowDebug", features.shadowDebug ?? 0);

    const ambientSrc = features.ambientColor ?? [1, 1, 1];
    if (ambientSrc !== this.#lastAmbientColor) {
      this.#cachedAmbientColor = new Vec3(ambientSrc);
      this.#lastAmbientColor = ambientSrc;
    }
    shaders.lighting.setUniformVec3("uAmbientColor", this.#cachedAmbientColor);
    shaders.lighting.setUniform1f("uAmbientIntensity", features.ambientIntensity ?? 0.01);

    app.forEachActiveComponent(Camera, (camera) => {
      camera.renderCameraToLighting();
    });

    let isFirstLight = true;
    app.forEachActiveComponent(Light, (light) => {
      shaders.lighting.setUniform1i("uIsFirstLight", isFirstLight ? 1 : 0);
      isFirstLight = false;
      this.#shadow?.bindForLight(app, light, resources);
      light.renderLight();
    });

    if (isFirstLight) {
      shaders.lighting.setUniform1i("uIsFirstLight", 1);
      shaders.lighting.setUniform1i("uLight.type", 0);
      shaders.lighting.setUniform1f("uLight.intensity", 0);
      shaders.lighting.setUniform1f("uShadowStrength", 0);
      renderer.drawArrays(shared.fullscreenQuad, {
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

    // Release sampler bindings so the next frame's geometry pass can write to
    // the G-buffer textures without GL flagging a feedback loop. Geometry
    // renderers that bind their own material textures (MeshRenderer,
    // SkinnedMeshRenderer) would overwrite these slots anyway, but
    // SpriteRenderer and other lightweight components don't — pong's 2D
    // sprites were the reproducer.
    for (let i = 0; i <= 8; i++) renderer.unbindTextureAt?.(i);

    if (features.debugGLVerbose) renderer.debugCheckError?.("after lighting endPass");
  }
}
