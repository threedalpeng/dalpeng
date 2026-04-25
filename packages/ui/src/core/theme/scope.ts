import { findScope, pushScope } from "@dalpeng/core";
import { defaultTheme } from "./defaultTheme";
import type { Theme } from "./types";

/**
 * Read the theme of the active UI scope. Throws outside UI scope.
 * Inside UI scope with no explicit theme → `defaultTheme`.
 */
export function useTheme(): Theme {
  const scope = findScope("ui");
  if (!scope) {
    throw new Error(
      "useTheme() requires an active UI context. Call inside defineWidget/defineUI setup."
    );
  }
  return (scope.ui as { theme?: Theme })?.theme ?? defaultTheme;
}

/**
 * Internal — push a theme onto a fresh ui scope. Public consumers should
 * prefer `<ThemeProvider theme={...}>` (PR4 composite) which wires `applyTheme`
 * into the DOM as well. Returns an idempotent popper.
 */
export function pushTheme(theme: Theme): () => void {
  const pop = pushScope({
    kind: "ui",
    ui: { layout: { direction: "column", gap: 4 }, theme },
    cleanups: new Set(),
  });
  let called = false;
  return () => {
    if (called) return;
    called = true;
    pop();
  };
}
