import type Application from "../../Application";
import type Light from "../../graphics/Light";
import DirectionalShadowSystem from "../../graphics/shadows/DirectionalShadow";
import type FrameResources from "../FrameResources";
import type { RenderFrameContext, RenderPass } from "./RenderPass";

/**
 * Fills the shadow map for the first active directional light. Also exposes
 * `bindForLight()` so LightingPass can wire the per-light shadow uniforms
 * inside its additive light loop.
 */
export default class ShadowPass implements RenderPass {
  readonly name = "shadow";
  #system: DirectionalShadowSystem | null = null;

  init(): void {
    this.#system = new DirectionalShadowSystem();
  }

  execute(ctx: RenderFrameContext): void {
    this.#system?.update(ctx.app, ctx.resources);
  }

  /** Called by LightingPass during its per-light loop. No-op without a shadow system. */
  bindForLight(app: Application, light: Light, resources: FrameResources): void {
    this.#system?.bindForLight(app, light, resources);
  }

  dispose(): void {
    this.#system = null;
  }
}
