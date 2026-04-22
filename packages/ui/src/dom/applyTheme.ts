import type {
  ColorRole,
  ColorScale,
  ColorSteps,
  Surface,
  TextPalette,
  Theme,
  ThemeColor,
} from "../core/theme";

const STEP_KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const ALIAS_KEYS: (keyof ColorRole)[] = [
  "bg",
  "bgHover",
  "fg",
  "muted",
  "mutedHover",
  "border",
  "text",
];

/**
 * Apply theme's CSS vars on `root` and install preset-specific root props
 * (`-webkit-font-smoothing`, `image-rendering` for pixel mode).
 *
 * Emission strategy:
 *   - Primitive step: literal color.   `--ui-color-primary-500: #abc`
 *   - Semantic alias: var indirection. `--ui-color-primary-bg: var(--ui-color-primary-500)`
 *
 * The indirection means a primitive-step swap (dark mode, high-contrast,
 * brand customization) propagates automatically through CSS cascade — all
 * alias consumers re-resolve without re-emission.
 *
 * Returns an idempotent undo.
 */
export function applyTheme(root: HTMLElement, theme: Theme): () => void {
  const vars = flattenToCssVars(theme);
  for (const [name, value] of vars) root.style.setProperty(name, value);
  const rootPropsUndo = applyRootProps(root, theme);

  let called = false;
  return () => {
    if (called) return;
    called = true;
    for (const [name] of vars) root.style.removeProperty(name);
    rootPropsUndo();
  };
}

function applyRootProps(root: HTMLElement, theme: Theme): () => void {
  if (theme.preset !== "pixel") return () => {};
  const prev = {
    smoothing: root.style.getPropertyValue("-webkit-font-smoothing"),
    smoothing2: root.style.getPropertyValue("font-smooth"),
    imageRendering: root.style.getPropertyValue("image-rendering"),
  };
  root.style.setProperty("-webkit-font-smoothing", "none");
  root.style.setProperty("font-smooth", "never");
  root.style.setProperty("image-rendering", "pixelated");
  let called = false;
  return () => {
    if (called) return;
    called = true;
    if (prev.smoothing) root.style.setProperty("-webkit-font-smoothing", prev.smoothing);
    else root.style.removeProperty("-webkit-font-smoothing");
    if (prev.smoothing2) root.style.setProperty("font-smooth", prev.smoothing2);
    else root.style.removeProperty("font-smooth");
    if (prev.imageRendering) root.style.setProperty("image-rendering", prev.imageRendering);
    else root.style.removeProperty("image-rendering");
  };
}

function flattenToCssVars(theme: Theme): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  emitColor(theme.color, out);
  emitScale("spacing", theme.spacing, out, "px");
  emitScale("radius", theme.radius, out, "px");
  emitScale("shadow", theme.shadow, out);
  emitScale("font-size", theme.font.size, out, "px");
  emitScale("font-weight", theme.font.weight, out);
  emitScale("font-family", theme.font.family, out);
  emitScale("font-line-height", theme.font.lineHeight, out);
  emitScale("font-letter-spacing", theme.font.letterSpacing, out, "em");
  emitScale("motion-duration", theme.motion.duration, out, "ms");
  emitScale("motion-easing", theme.motion.easing, out);
  emitScale("z", theme.zIndex, out);
  return out;
}

function emitColor(color: ThemeColor, out: Array<[string, string]>): void {
  for (const [key, value] of Object.entries(color)) {
    // Top-level primitives like `transparent` / `current` / `black` / `white` / `scrim`.
    if (typeof value === "string") {
      out.push([`--ui-color-${kebab(key)}`, value]);
      continue;
    }
    // `surface` / `text` maps — flat key children.
    if (isSurfaceLike(key)) {
      for (const [sub, v] of Object.entries(value as Surface | TextPalette)) {
        out.push([`--ui-color-${key}-${kebab(sub)}`, v as string]);
      }
      continue;
    }
    // Remaining: ColorScale (primitive steps + semantic aliases).
    emitColorScale(key, value as ColorScale, out);
  }
}

function isSurfaceLike(key: string): boolean {
  return key === "surface" || key === "text";
}

function emitColorScale(roleName: string, scale: ColorScale, out: Array<[string, string]>): void {
  // Primitive steps — literal values.
  for (const step of STEP_KEYS) {
    const value = (scale as ColorSteps)[step];
    if (value !== undefined) {
      out.push([`--ui-color-${roleName}-${step}`, value]);
    }
  }
  // Semantic aliases — indirect through the primitive var for cascade-level swap.
  const stepByAlias = mapAliasToStep(scale);
  for (const alias of ALIAS_KEYS) {
    const step = stepByAlias[alias];
    const cssName = `--ui-color-${roleName}-${kebab(alias)}`;
    if (step !== undefined) {
      out.push([cssName, `var(--ui-color-${roleName}-${step})`]);
    } else {
      // fg after contrast-first fallback — emit as literal.
      out.push([cssName, scale[alias]]);
    }
  }
}

// Compute which primitive step each alias currently resolves to (for var indirection).
// Missing entry → alias was replaced by contrast-first fallback (#fff / #000).
function mapAliasToStep(scale: ColorScale): Partial<Record<keyof ColorRole, number>> {
  const map: Partial<Record<keyof ColorRole, number>> = {};
  for (const alias of ALIAS_KEYS) {
    for (const step of STEP_KEYS) {
      if ((scale as ColorSteps)[step] === scale[alias]) {
        map[alias] = step;
        break;
      }
    }
  }
  return map;
}

function emitScale<T extends Record<string, string | number>>(
  prefix: string,
  scale: T,
  out: Array<[string, string]>,
  unit?: "px" | "ms" | "em"
): void {
  for (const [k, v] of Object.entries(scale)) {
    const name = `--ui-${prefix}-${kebab(k)}`;
    if (typeof v === "number") {
      out.push([name, unit ? `${v}${unit}` : String(v)]);
    } else {
      out.push([name, v]);
    }
  }
}

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/^-/, "");
}
