import { findScope } from "@dalpeng/core";

export interface Theme {
  color: Record<string, string>;
  spacing: Record<string, number>;
  font: {
    size: Record<string, number>;
    weight: Record<string, number>;
    family: Record<string, string>;
  };
  radius: Record<string, number>;
  shadow: Record<string, string>;
  zIndex: Record<string, number>;
}

export const defaultTheme: Theme = {
  color: {
    fg: "#e6e8ec",
    fgMuted: "#9ba3b0",
    fgDim: "#6b7280",
    bg: "#13161c",
    bgSunken: "#0d1014",
    bgMuted: "#1a1d23",
    border: "#2a2f38",
    accent: "#7be0a1",
    modified: "#f59e0b",
    pinned: "#a78bfa",
    danger: "#e26b6b",
  },
  spacing: {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  font: {
    size: { xs: 9, sm: 10, md: 11, lg: 13, xl: 16 },
    weight: { normal: 400, medium: 500, bold: 600 },
    family: {
      body: "system-ui, sans-serif",
      mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    },
  },
  radius: { sm: 2, md: 4, lg: 8, full: 9999 },
  shadow: {
    sm: "0 1px 2px rgba(0,0,0,0.2)",
    md: "0 4px 8px rgba(0,0,0,0.3)",
  },
  zIndex: {
    base: 0,
    raised: 10,
    floating: 100,
    modal: 1000,
    toast: 9999,
  },
};

export function defineTheme<T extends Theme>(theme: T): T {
  return theme;
}

/** Apply theme's CSS vars on `root`. Returns an idempotent undo. */
export function applyTheme(root: HTMLElement, theme: Theme): () => void {
  const vars = flattenToCssVars(theme);
  for (const [name, value] of vars) root.style.setProperty(name, value);
  let called = false;
  return () => {
    if (called) return;
    called = true;
    for (const [name] of vars) root.style.removeProperty(name);
  };
}

/**
 * Read the theme of the active UI scope. Throws outside UI scope.
 * Inside UI scope with no explicit theme → `defaultTheme`.
 */
export function useTheme(): Theme {
  const scope = findScope("ui");
  if (!scope) {
    throw new Error(
      "useTheme() requires an active UI context. Call inside defineComponent/defineUI setup."
    );
  }
  const payload = scope.ui as { theme?: Theme } | null;
  return payload?.theme ?? defaultTheme;
}

function flattenToCssVars(theme: Theme): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(theme.color)) {
    out.push([`--ui-color-${kebab(k)}`, v]);
  }
  for (const [k, v] of Object.entries(theme.spacing)) {
    out.push([`--ui-spacing-${kebab(k)}`, `${v}px`]);
  }
  for (const [k, v] of Object.entries(theme.font.size)) {
    out.push([`--ui-font-size-${kebab(k)}`, `${v}px`]);
  }
  for (const [k, v] of Object.entries(theme.font.weight)) {
    out.push([`--ui-font-weight-${kebab(k)}`, String(v)]);
  }
  for (const [k, v] of Object.entries(theme.font.family)) {
    out.push([`--ui-font-family-${kebab(k)}`, v]);
  }
  for (const [k, v] of Object.entries(theme.radius)) {
    out.push([`--ui-radius-${kebab(k)}`, `${v}px`]);
  }
  for (const [k, v] of Object.entries(theme.shadow)) {
    out.push([`--ui-shadow-${kebab(k)}`, v]);
  }
  for (const [k, v] of Object.entries(theme.zIndex)) {
    out.push([`--ui-z-${kebab(k)}`, String(v)]);
  }
  return out;
}

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
