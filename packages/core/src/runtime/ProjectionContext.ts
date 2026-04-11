/**
 * `ProjectionContext` — capability-based host abstraction for UI
 * renderers (D-PROJECTION-CONTEXT).
 *
 * Earlier dalpeng iterations either passed `Application` directly to UI
 * renderers (god object) or invented a single-method `UIHost` interface
 * that everyone bypassed. Both were wrong. The right answer is to
 * decompose what a renderer actually needs into small *capability
 * interfaces* and have the renderer take only the ones it uses.
 *
 * ## Capabilities
 *
 *   - `DocumentContext`  : DOM `document` for createElement (default vs popup)
 *   - `OverlayContext`   : canvas + viewport rect for overlay-positioned UI
 *   - `FeaturesContext`  : feature key bindings for `Toggle("shadows")` etc.
 *   - `LayerContext`     : layer registry for z-order
 *   - `DisposeContext`   : host-level cleanup hook
 *
 * ## Each backend takes only what it needs
 *
 *   - Game UI canvas overlay (Phase 1) → all five
 *   - DevTools popup UI                → Document + Layer + Dispose
 *   - Render-to-texture (Phase 3+)    → Document + Surface + Layer + Dispose
 *   - Canvas-native sprite (Phase 4+) → TBD (sprite quad capability)
 *
 * The combined `ProjectionContext` type alias below is the *richest* set
 * (game UI canvas overlay). Smaller backends pick a subset using TS
 * structural typing — no inheritance gymnastics, just intersect the
 * capability interfaces you need.
 *
 * ## Why interfaces, not classes
 *
 * Each capability is a type, not a class. The host (typically
 * `Application`) implements them via plain functions and refs. There is
 * no shared base class to inherit from — each backend builds its own
 * concrete object that satisfies the structural shape.
 *
 * @see docs/design/decisions.md#d-projection-context-renderer-host-의-capability-기반-합성
 * @see docs/plans/authoritative-runtime.md
 */

import type { LayerRegistry } from "./Layer";

/**
 * DOM `document` ownership. Used by any renderer that builds DOM
 * elements (`document.createElement`). Most renderers pass the global
 * `document`; popup-based hosts (DevTools popout) pass the popup's
 * `document` so created elements live in the popup's frame.
 */
export interface DocumentContext {
  readonly doc: Document;
}

/**
 * Canvas overlay coordinates. Used by renderers that position UI
 * relative to the game canvas (HUD on top of WebGL viewport). Provides
 * the canvas itself, a current viewport rect (in CSS pixels), and a
 * subscription for resize events so the renderer can sync.
 *
 * Renderers that don't position relative to a canvas (DevTools dock,
 * render-to-texture) do not take this capability.
 */
export interface OverlayContext {
  readonly canvas: HTMLCanvasElement;
  /**
   * Current viewport rect of the canvas in CSS pixels. The renderer
   * calls this on every layout pass; it's a function so the host can
   * compute it lazily (e.g. read `getBoundingClientRect`).
   */
  viewport(): { x: number; y: number; width: number; height: number };
  /**
   * Subscribe to canvas resize events. Returns an unsubscribe function.
   * The renderer typically wires this to re-position overlay elements
   * when the canvas changes size (browser resize, fit mode change).
   */
  onCanvasResize(cb: () => void): () => void;
}

/**
 * Reactive feature key binding. Used by UI atoms that take a feature
 * key string (`Toggle("shadows", "Shadows")`) instead of a ref. The
 * renderer reads + writes the named key on `features` and watches for
 * changes via `watchFeature`.
 *
 * Standalone UI hosts (DevTools popup, hypothetical preview tool) do
 * not take this capability — feature key binding only makes sense in
 * the context of a running game application.
 */
export interface FeaturesContext {
  readonly features: Record<string, unknown>;
  watchFeature(
    key: string,
    cb: (newVal: unknown, oldVal: unknown) => void,
  ): () => void;
}

/**
 * Layer registry binding. Used by renderers that need to translate
 * layer names (`"hud"`, `"world-ui"`) to z-order indices. The registry
 * lives on the host (typically `Application.layers`) and is shared
 * with the game render pipeline.
 */
export interface LayerContext {
  readonly layers: LayerRegistry;
}

/**
 * Host-level disposal. The renderer registers cleanup callbacks that
 * fire when the host (or scene, or popup window) is torn down. The
 * cleanup runs *after* per-instance detach — this is the host telling
 * its renderers "everything is going away, last chance to release
 * shared resources" (event listeners on `window`, etc.).
 */
export interface DisposeContext {
  onDispose(cb: () => void): void;
}

/**
 * Composite type for the *game UI canvas overlay* renderer — the
 * Phase 1 default. Other backends pick a subset of these capabilities.
 */
export type ProjectionContext = DocumentContext &
  OverlayContext &
  FeaturesContext &
  LayerContext &
  DisposeContext;
