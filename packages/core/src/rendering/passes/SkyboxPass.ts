import type GfxBuffer from "../../gfx/Buffer";
import type GfxVertexArray from "../../gfx/VertexArray";
import Camera from "../../graphics/Camera";
import type { RenderFrameContext, RenderInitContext, RenderPass } from "./RenderPass";

export default class SkyboxPass implements RenderPass {
  readonly name = "skybox";

  #vao: GfxVertexArray | null = null;
  #vbo: GfxBuffer | null = null;

  init(ctx: RenderInitContext): void {
    ctx.shaders.skybox.use();
    ctx.shaders.skybox.setUniform1i("uSkybox", 0);
  }

  shouldRun(ctx: RenderFrameContext): boolean {
    const hasEnv = !!ctx.shared.iblPrecompute.resources;
    const requested = ctx.features.skybox ?? ctx.features.ibl;
    return hasEnv && !!requested;
  }

  execute(ctx: RenderFrameContext): void {
    const { app, renderer, resources, features, shaders, shared } = ctx;
    const iblRes = shared.iblPrecompute.resources;
    if (!iblRes || !resources.lighting) return;

    if (!this.#vao) {
      this.#vao = renderer.createVertexArray();
      this.#vbo = renderer.createBuffer("vertex");
      // prettier-ignore
      this.#vbo.update(new Float32Array([
        -1,-1,-1,  1, 1,-1,  1,-1,-1,  -1,-1,-1, -1, 1,-1,  1, 1,-1,
        -1,-1, 1,  1,-1, 1,  1, 1, 1,  -1,-1, 1,  1, 1, 1, -1, 1, 1,
        -1,-1,-1, -1,-1, 1, -1, 1, 1,  -1,-1,-1, -1, 1, 1, -1, 1,-1,
         1,-1, 1,  1,-1,-1,  1, 1,-1,   1,-1, 1,  1, 1,-1,  1, 1, 1,
        -1,-1,-1,  1,-1,-1,  1,-1, 1,  -1,-1,-1,  1,-1, 1, -1,-1, 1,
        -1, 1, 1,  1, 1, 1,  1, 1,-1,  -1, 1, 1,  1, 1,-1, -1, 1,-1,
      ]));
      const posLoc = shaders.skybox.getAttribLocation("aPosition");
      this.#vao.setVertexBuffer(posLoc, this.#vbo!, 3);
    }

    shaders.skybox.use();
    iblRes.envCubemap.bind(0);

    app.forEachActiveComponent(Camera, (camera) => {
      shaders.skybox.setUniformMat4("uView", camera.viewMatrix);
      shaders.skybox.setUniformMat4("uProjection", camera.glProjectionMatrix);
    });
    shaders.skybox.setUniform1f(
      "uExposure",
      features.skyboxExposure ?? features.toneExposure ?? 1.0
    );

    renderer.beginPass({
      target: resources.lighting.rt,
      depthTest: true,
      depthWrite: false,
      blend: { enable: false },
    });
    renderer.setCullFace?.(false);
    renderer.drawArrays(this.#vao, { mode: "triangles", count: 36 });
    renderer.setCullFace?.(true);
    renderer.endPass();
  }

  dispose(): void {
    this.#vbo?.dispose();
    this.#vao = null;
    this.#vbo = null;
  }
}
