import type { ReadonlyRef } from "@dalpeng/core";
import { isRef } from "@dalpeng/core";
import { defineComponent, type Child, type UIElement } from "../../core/element";
import type { Theme } from "../../core/theme";
import { applyTheme } from "../applyTheme";

export interface ThemeProviderProps {
  theme: Theme | ReadonlyRef<Theme>;
  children?: Child;
}

/**
 * Wraps a subtree in a `<div>` with the given theme's CSS vars applied.
 * Children consume the theme via CSS cascade — `$color.*` / `$spacing.*`
 * tokens resolve against the provider's vars.
 *
 * Accepts `Theme | ReadonlyRef<Theme>` — reactive swap re-applies vars.
 *
 * Caveat: `useTheme()` inside children still resolves against the outer UI
 * scope, not this provider. Prefer token-based styling which works through
 * cascade without JS lookup.
 */
export const ThemeProvider = defineComponent<ThemeProviderProps>(
  ({ theme, children }): UIElement => (
    <div
      ref={(el: Element) => {
        const root = el as HTMLElement;
        let undo = applyTheme(root, isRef(theme) ? theme.value : theme);
        if (isRef(theme)) {
          const unsub = theme.subscribe((next) => {
            undo();
            undo = applyTheme(root, next);
          });
          return () => {
            unsub();
            undo();
          };
        }
        return undo;
      }}
    >
      {children}
    </div>
  )
);
