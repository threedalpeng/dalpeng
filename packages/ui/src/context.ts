import { findScope, pushScope } from "@dalpeng/core";
import type { Cleanup } from "./bindings";
import type { Placement } from "./placement";
import type { Theme } from "./theme";

export interface UIContext {
  /** Written by `useLayout`. Applied by the UI mount root (if any). */
  layout: { direction: "column" | "row"; gap: number; align?: string };
  /** Written by `usePlacement`. Read back by scene UI renderer. */
  placement?: Placement;
  /** Written by `withLayer`. Read back by scene UI renderer. */
  layer?: string;
  /** Active theme. Read by `useTheme()`. Mount seeds this. */
  theme?: Theme;
}

export function pushUIScope(ctx: UIContext): { cleanups: Set<Cleanup>; pop: () => void } {
  const cleanups = new Set<Cleanup>();
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
      `${hookName}() requires an active UI context (must be called inside defineUI/defineComponent setup).`
    );
  }
  return ui;
}

export function useLayout(
  direction: "row" | "column",
  opts?: { gap?: number; align?: string }
): void {
  const ctx = requireUI("useLayout");
  ctx.layout.direction = direction;
  if (opts?.gap !== undefined) ctx.layout.gap = opts.gap;
  if (opts?.align !== undefined) ctx.layout.align = opts.align;
}

export function usePlacement(placement: Placement): void {
  requireUI("usePlacement").placement = placement;
}

export function withLayer(name: string): void {
  requireUI("withLayer").layer = name;
}
