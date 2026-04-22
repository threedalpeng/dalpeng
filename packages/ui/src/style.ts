import type { ReadonlyRef } from "@dalpeng/core";

/**
 * Numeric value on these keys is auto-suffixed with `px`. Anything unlisted:
 * bare `String(n)` for unitless keys (below), passthrough otherwise.
 */
export const LENGTH_KEYS: ReadonlySet<string> = new Set([
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "gap",
  "rowGap",
  "columnGap",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "top",
  "right",
  "bottom",
  "left",
  "fontSize",
  "letterSpacing",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderWidth",
  "outlineWidth",
  "outlineOffset",
]);

export const UNITLESS_KEYS: ReadonlySet<string> = new Set([
  "opacity",
  "zIndex",
  "fontWeight",
  "lineHeight",
  "flex",
  "flexGrow",
  "flexShrink",
  "order",
]);

const SHORTCUT_MAP: Readonly<Record<string, readonly string[]>> = {
  paddingX: ["paddingLeft", "paddingRight"],
  paddingY: ["paddingTop", "paddingBottom"],
  marginX: ["marginLeft", "marginRight"],
  marginY: ["marginTop", "marginBottom"],
};

export type CSSVarName = `--${string}`;
export type StyleValue = string | number | ReadonlyRef<string | number>;

export type Style = {
  [key: string]: StyleValue | undefined;
};

/** `paddingX` → `paddingLeft` + `paddingRight`; unlisted keys passthrough. */
export function expandShortcut(key: string): readonly string[] {
  return SHORTCUT_MAP[key] ?? [key];
}

/**
 * Convert a single resolved value to its CSS string form:
 * - `"$color.accent"` → `"var(--ui-color-accent)"`
 * - numeric on length key → `"{n}px"`
 * - numeric on unitless key → `"{n}"`
 * - numeric on unknown key → `"{n}"` (passthrough)
 * - string → verbatim
 *
 * CSS custom property keys (`--x`) skip token resolution but still accept
 * numbers (stringified).
 */
export function resolveStyleValue(key: string, value: string | number): string {
  if (key.startsWith("--")) {
    return typeof value === "number" ? String(value) : value;
  }
  if (typeof value === "string") {
    if (value.startsWith("$")) return tokenToCssVar(value);
    return value;
  }
  if (UNITLESS_KEYS.has(key)) return String(value);
  if (LENGTH_KEYS.has(key)) return `${value}px`;
  return String(value);
}

function tokenToCssVar(token: string): string {
  // token = "$color.accent" / "$font.size.sm" / "$font.family.mono"
  const path = token.slice(1);
  const flat = path.replace(/\./g, "-").replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return `var(--ui-${flat})`;
}
