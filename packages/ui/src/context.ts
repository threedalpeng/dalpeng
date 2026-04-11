import type { Placement } from "./placement";
import type { NodeDescriptor } from "./types";

export interface UIContext {
  nodes: NodeDescriptor[];
  layout: { direction: "column" | "row"; gap: number; align?: string };
  /** Written by `usePlacement`. Read back by `renderDescriptor`. */
  placement?: Placement;
  /** Written by `withLayer` (UI scope). Read back by `renderDescriptor`. */
  layer?: string;
}

let thisUI: UIContext | null = null;

export function getThisUI(): UIContext | null {
  return thisUI;
}

export function setThisUI(ui: UIContext | null): void {
  thisUI = ui;
}

export function requireUI(hookName: string): UIContext {
  if (!thisUI) {
    throw new Error(
      `${hookName}() requires an active UI context (must be called inside defineUI setup).`,
    );
  }
  return thisUI;
}
