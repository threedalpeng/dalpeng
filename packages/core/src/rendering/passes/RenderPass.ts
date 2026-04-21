import type Application from "../../Application";
import type { RendererBackend } from "../../gfx/RendererBackend";
import type GfxVertexArray from "../../gfx/VertexArray";
import type { RenderConfig } from "../../RenderConfig";
import type FrameResources from "../FrameResources";
import type IBLPrecompute from "../IBLPrecompute";
import type PipelineShaders from "./PipelineShaders";

export interface SharedRenderResources {
  readonly fullscreenQuad: GfxVertexArray;
  readonly iblPrecompute: IBLPrecompute;
}

export interface PipelineIntrospection {
  getPass<T extends RenderPass = RenderPass>(name: string): T | null;
  readonly passes: readonly RenderPass[];
}

export interface RenderInitContext {
  readonly renderer: RendererBackend;
  readonly shaders: PipelineShaders;
  readonly shared: SharedRenderResources;
  readonly pipeline: PipelineIntrospection;
}

export interface RenderFrameContext {
  readonly app: Application;
  readonly renderer: RendererBackend;
  readonly resources: FrameResources;
  readonly features: RenderConfig;
  readonly shaders: PipelineShaders;
  readonly shared: SharedRenderResources;
  readonly pipeline: PipelineIntrospection;
}

export interface RenderPass {
  readonly name: string;
  init?(ctx: RenderInitContext): Promise<void> | void;
  shouldRun?(ctx: RenderFrameContext): boolean;
  execute(ctx: RenderFrameContext): void;
  dispose?(): void;
}
