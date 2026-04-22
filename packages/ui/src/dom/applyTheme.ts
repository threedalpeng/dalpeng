import type { Theme } from "../core/theme";

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
