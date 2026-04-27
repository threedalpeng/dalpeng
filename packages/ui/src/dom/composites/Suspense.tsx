import { computed, type ReadonlyRef } from "@dalpeng/core";
import type { UIElement } from "../../core/element";
import { defineWidget } from "../../core/element";
import { Show } from "../atoms/Show";

export interface SuspenseProps {
  /**
   * One or more loading-state Refs. Suspense renders `fallback` while ANY are
   * true; renders `children` once all are false. Pass a single Ref or an array
   * (e.g. from `useTexture`/`useModel`'s `.loading`).
   */
  pending: ReadonlyRef<boolean> | ReadonlyArray<ReadonlyRef<boolean>>;
  fallback: UIElement;
  children: UIElement;
}

/**
 * Loading boundary. Built on top of `Show`: when any pending ref is true the
 * fallback is mounted; once all are false the children mount. The mounted
 * subtree is cached so flipping back to fallback (e.g. dependency reload) does
 * not re-run the children's setup.
 *
 * Typical usage with asset hooks:
 *
 *     const tex = useTexture("/atlas.png");
 *     const model = useModel("/scene.glb");
 *     <Suspense pending={[tex.loading, model.loading]} fallback={<Spinner/>}>
 *       <World />
 *     </Suspense>
 */
export const Suspense = defineWidget<SuspenseProps>(({ pending, fallback, children }) => {
  const refs = Array.isArray(pending) ? pending : [pending as ReadonlyRef<boolean>];
  const ready = computed(() => !refs.some((r) => r.value));
  return <Show when={ready} body={children} fallback={fallback} />;
});
