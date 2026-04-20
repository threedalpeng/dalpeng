import { findScope, pushScope } from "@dalpeng/core";
import type { Placement } from "./placement";
import type { UIChild } from "./types";

export interface UIContext {
  nodes: UIChild[];
  layout: { direction: "column" | "row"; gap: number; align?: string };
  /** Written by `usePlacement`. Read back by `renderUI`. */
  placement?: Placement;
  /** Written by `withLayer` (UI scope). Read back by `renderUI`. */
  layer?: string;
}

/**
 * Push a UI scope onto the shared core scope stack. The UI frame holds the
 * UIContext as `ui` payload plus a cleanups bucket (reactive `watch` /
 * `computed` registered inside the setup body land here).
 */
export function pushUIScope(ctx: UIContext): {
  cleanups: Set<() => void>;
  pop: () => void;
} {
  const cleanups = new Set<() => void>();
  const pop = pushScope({ kind: "ui", ui: ctx, cleanups });
  return { cleanups, pop };
}

export function getThisUI(): UIContext | null {
  const scope = findScope("ui");
  return (scope?.ui as UIContext | null) ?? null;
}

export function requireUI(hookName: string): UIContext {
  const ui = getThisUI();
  if (!ui) {
    throw new Error(
      `${hookName}() requires an active UI context (must be called inside defineUI setup).`
    );
  }
  return ui;
}
