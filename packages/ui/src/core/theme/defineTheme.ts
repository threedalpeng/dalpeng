import { toColorRole } from "./derive";
import { presetTokens } from "./presets";
import type {
  ColorMode,
  ColorScale,
  ColorSeeds,
  DeepPartial,
  DefineThemeInput,
  Surface,
  TextPalette,
  Theme,
  ThemeColor,
} from "./types";

const DEFAULT_SEEDS: Required<ColorSeeds> = {
  primary: "#7be0a1",
  accent: "#6ca0ff",
  neutral: "#8b92a0",
  success: "#3fb950",
  warning: "#f0b33a",
  danger: "#e26b6b",
  info: "#5ab8e6",
};

/**
 * Canonical theme factory — absorbs seed derivation, base-theme extension,
 * and literal pass-through into one entry point.
 *
 * Modes:
 *   defineTheme(literalTheme)                            → pass-through
 *   defineTheme({ seeds, preset, mode })                 → fresh derivation
 *   defineTheme({ base })                                → clone
 *   defineTheme({ base, overrides })                     → extend
 *   defineTheme({ base, seeds, overrides })              → re-derive seeds on base
 */
export function defineTheme(input: DefineThemeInput | Theme): Theme {
  if (isTheme(input)) return input;

  const mode: ColorMode = input.mode ?? input.base?.mode ?? "light";
  const preset = input.preset ?? input.base?.preset ?? "smooth";
  const tokens = presetTokens(preset);

  // Seed merge precedence: DEFAULT_SEEDS → base's effective seeds (by step 500) → input seeds
  const baseSeeds = input.base ? extractSeeds(input.base) : {};
  const seeds = { ...DEFAULT_SEEDS, ...baseSeeds, ...(input.seeds ?? {}) };

  const color: ThemeColor = buildColor(seeds, mode, preset, input.base);

  const theme: Theme = {
    color,
    spacing: tokens.spacing,
    radius: tokens.radius,
    shadow: tokens.shadow,
    font: tokens.font,
    motion: tokens.motion,
    zIndex: tokens.zIndex,
    preset,
    mode,
  };

  return input.overrides ? deepMerge(theme, input.overrides) : theme;
}

function isTheme(input: DefineThemeInput | Theme): input is Theme {
  return (
    typeof (input as Theme).preset === "string" &&
    typeof (input as Theme).mode === "string" &&
    (input as Theme).color !== undefined &&
    (input as Theme).spacing !== undefined
  );
}

function extractSeeds(theme: Theme): ColorSeeds {
  // The seed is the step-500 entry (light-mode anchor). In dark mode step 500
  // still carries the seed's hue/chroma — re-deriving from it is lossy but
  // sufficient for extend cases.
  return {
    primary: theme.color.primary[500],
    accent: theme.color.accent[500],
    neutral: theme.color.neutral[500],
    success: theme.color.success[500],
    warning: theme.color.warning[500],
    danger: theme.color.danger[500],
    info: theme.color.info[500],
  };
}

function buildColor(
  seeds: Required<ColorSeeds>,
  mode: ColorMode,
  preset: "smooth" | "pixel",
  base?: Theme
): ThemeColor {
  const role = (seed: string): ColorScale => toColorRole(seed, { mode, preset });
  const primary = role(seeds.primary);
  const accent = role(seeds.accent);
  const neutral = role(seeds.neutral);
  const success = role(seeds.success);
  const warning = role(seeds.warning);
  const danger = role(seeds.danger);
  const info = role(seeds.info);

  const surface = buildSurface(neutral, mode);
  const text = buildText(neutral, mode);
  const scrim = mode === "light" ? "rgba(0, 0, 0, 0.35)" : "rgba(0, 0, 0, 0.65)";

  const out: ThemeColor = {
    primary,
    accent,
    neutral,
    success,
    warning,
    danger,
    info,
    surface,
    scrim,
    text,
    transparent: "transparent",
    current: "currentColor",
    black: "#000000",
    white: "#ffffff",
  };

  // Preserve augmented roles from base (game-specific extensions).
  if (base) {
    const sink = out as unknown as Record<string, unknown>;
    const src = base.color as unknown as Record<string, unknown>;
    for (const key of Object.keys(src)) {
      if (!(key in sink)) sink[key] = src[key];
    }
  }

  return out;
}

function buildSurface(neutral: ColorScale, mode: ColorMode): Surface {
  if (mode === "light") {
    return {
      low: neutral[50],
      base: "#ffffff",
      high: "#ffffff",
    };
  }
  return {
    low: neutral[950],
    base: neutral[900],
    high: neutral[800],
  };
}

function buildText(neutral: ColorScale, mode: ColorMode): TextPalette {
  if (mode === "light") {
    return {
      primary: neutral[900],
      secondary: neutral[700],
      muted: neutral[500],
      inverse: neutral[50],
    };
  }
  return {
    primary: neutral[50],
    secondary: neutral[200],
    muted: neutral[400],
    inverse: neutral[900],
  };
}

// Deep-merge for overrides — arrays replace, plain objects recurse, primitives replace.
function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (patch == null) return base;
  if (typeof patch !== "object" || Array.isArray(patch)) return patch as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch)) {
    if (v == null) continue;
    const existing = out[k];
    if (
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing) &&
      typeof v === "object" &&
      !Array.isArray(v)
    ) {
      out[k] = deepMerge(existing, v as DeepPartial<typeof existing>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}
