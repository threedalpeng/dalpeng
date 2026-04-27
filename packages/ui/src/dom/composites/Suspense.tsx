import { computed, type ReadonlyRef } from "@dalpeng/core";
import type { UIElement } from "../../core/element";
import { defineWidget } from "../../core/element";
import { Show } from "../atoms/Show";

export interface SuspenseProps {
  /** Renders `fallback` while ANY is true, `children` once all are false. */
  pending: ReadonlyRef<boolean> | ReadonlyArray<ReadonlyRef<boolean>>;
  fallback: UIElement;
  children: UIElement;
}

export const Suspense = defineWidget<SuspenseProps>(({ pending, fallback, children }) => {
  const refs = Array.isArray(pending) ? pending : [pending as ReadonlyRef<boolean>];
  const ready = computed(() => !refs.some((r) => r.value));
  return <Show when={ready} body={children} fallback={fallback} />;
});
