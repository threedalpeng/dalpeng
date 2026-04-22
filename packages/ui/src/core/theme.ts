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
  return (scope.ui as { theme?: Theme })?.theme ?? defaultTheme;
}
