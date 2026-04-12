/**
 * `UIRenderer` plugin contract — the boundary between `core`'s logical
 * tree / lifecycle / ownership graph and the actual rendering of UI to
 * a backend (DOM overlay, render-to-texture, sprite quad, ...).
 *
 * `core` owns the descriptor / instance / cascade machinery but knows
 * *nothing* about how UI is rendered. It defines this interface, holds
 * a single registered implementation (set via
 * `Application.registerUIRenderer`), and calls `materialize` whenever
 * the Materializer needs to project a `UIDescriptor` into a live
 * `UIInstance`.
 *
 * The implementation lives in `@dalpeng/ui` (for DOM) or future packages
 * (for canvas-native sprite, render-to-texture, etc.). This split keeps
 * package dependencies single-direction (`core` ← `@dalpeng/ui`) per
 * D-LAYER-OWNERSHIP — `core` never imports `@dalpeng/ui`.
 *
 * @see docs/design/decisions.md#d-projection-context-renderer-host-의-capability-기반-합성
 * @see docs/plans/authoritative-runtime.md
 */

import type Scene from "../Scene";
import type { UIDescriptor } from "./Descriptor";
import type { EntityInstance, UIInstance } from "./Instance";
import type { ProjectionContext } from "./ProjectionContext";

/**
 * Plugin contract for materialising `UIDescriptor` → `UIInstance`.
 *
 * The Materializer calls `materialize(descriptor, context, owner)`
 * during the runtime walk. The renderer is responsible for:
 *   1. Running `descriptor.setup(descriptor.props)` inside an
 *      appropriate UI scope (so setup-time hooks like `usePlacement`
 *      and `withLayer` work)
 *   2. Building the renderer-specific state (DOM tree, sprite batch,
 *      whatever the backend needs)
 *   3. Wiring cleanups (reactive subscriptions, event listeners)
 *   4. Returning a `UIInstance` whose:
 *      - `descriptor` is the input
 *      - `owner` is the input
 *      - `rendererState` is the renderer's opaque payload
 *      - `detach()` is **idempotent** — second call must be a no-op
 *
 * The renderer must not register itself with the lifecycle queue or
 * the destroy cascade — `core`'s Materializer does that.
 */
export interface UIRenderer {
  /**
   * Materialise a UI descriptor. Called once per descriptor by the
   * Materializer during the descriptor tree walk.
   *
   * @param descriptor  the UI recipe to materialise
   * @param context     the host capabilities the renderer needs
   * @param owner       the parent in the ownership graph (Scene for
   *                    root UI, EntityInstance for cross-kind ui child)
   */
  materialize(
    descriptor: UIDescriptor,
    context: ProjectionContext,
    owner: EntityInstance | Scene
  ): UIInstance;
}
