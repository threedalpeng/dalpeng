// Token path → CSS var name resolver.
// Rules:
//   "$color.primary.500"        → "var(--ui-color-primary-500)"
//   "$color.primary.bg"         → "var(--ui-color-primary-bg)"
//   "$color.primary.bgHover"    → "var(--ui-color-primary-bg-hover)"   (camel → kebab)
//   "$color.surface.base"       → "var(--ui-color-surface-base)"
//   "$color.scrim"              → "var(--ui-color-scrim)"
//   "$spacing.md"               → "var(--ui-spacing-md)"
//   "$radius.lg"                → "var(--ui-radius-lg)"
//   "$zIndex.modal"             → "var(--ui-z-modal)"
//   "$font.size.md"             → "var(--ui-font-size-md)"
//   "$motion.duration.fast"     → "var(--ui-motion-duration-fast)"

const TOKEN_PREFIX = "$";

export function isThemeToken(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(TOKEN_PREFIX);
}

export function resolveToken(path: string): string {
  if (!path.startsWith(TOKEN_PREFIX)) return path;
  const body = path.slice(1);
  const kebabed = body
    .split(".")
    .map((seg) => (/^\d+$/.test(seg) ? seg : kebab(seg)))
    .join("-");
  // zIndex → z (short prefix, matches CSS convention)
  const varName = kebabed.replace(/^z-index-/, "z-");
  return `var(--ui-${varName})`;
}

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
