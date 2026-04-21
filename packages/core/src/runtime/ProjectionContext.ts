import type { LayerRegistry } from "./Layer";

export interface DocumentContext {
  readonly doc: Document;
}

export interface OverlayContext {
  readonly canvas: HTMLCanvasElement;
  viewport(): { x: number; y: number; width: number; height: number };
  onCanvasResize(cb: () => void): () => void;
}

export interface FeaturesContext {
  readonly features: Record<string, unknown>;
  watchFeature(key: string, cb: (newVal: unknown, oldVal: unknown) => void): () => void;
}

export interface LayerContext {
  readonly layers: LayerRegistry;
}

export interface DisposeContext {
  onDispose(cb: () => void): void;
}

export type ProjectionContext = DocumentContext &
  OverlayContext &
  FeaturesContext &
  LayerContext &
  DisposeContext;
