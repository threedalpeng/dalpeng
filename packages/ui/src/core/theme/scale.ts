import { hexToOklch, oklchToHex, type OKLCH } from "./oklch";
import type { ColorMode, ColorSteps, StylePreset } from "./types";

// L distribution — step 500 anchors on seed L. Flanks fan out symmetrically
// in the mode-appropriate direction.
const LIGHT_L = [0.985, 0.95, 0.9, 0.82, 0.7, 0.58, 0.48, 0.38, 0.26, 0.18, 0.12];
const DARK_L = [0.12, 0.18, 0.26, 0.38, 0.48, 0.58, 0.7, 0.82, 0.9, 0.95, 0.985];

// Chroma taper — extremes flatten (50/950), middle tracks the seed's chroma.
const C_FACTORS = [0.05, 0.1, 0.25, 0.5, 0.75, 1.0, 1.0, 0.9, 0.6, 0.35, 0.15];

const STEP_KEYS: (keyof ColorSteps)[] = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as unknown as (keyof ColorSteps)[];

/**
 * Derive an 11-step color scale from a seed. Step 500 inherits the seed's
 * hue and chroma at the mode-appropriate lightness; surrounding steps are
 * computed in OKLCH with shared hue, tapered chroma, and a fixed L ladder.
 */
export function deriveColorSteps(seed: string, mode: ColorMode, preset: StylePreset): ColorSteps {
  const base = hexToOklch(seed);
  const ladder = mode === "light" ? LIGHT_L : DARK_L;

  const out = {} as ColorSteps;
  for (let i = 0; i < STEP_KEYS.length; i++) {
    const lch: OKLCH = {
      L: snapIfPixel(ladder[i], 0.05, preset),
      C: snapIfPixel(base.C * C_FACTORS[i], 0.02, preset),
      H: base.H,
    };
    out[STEP_KEYS[i]] = oklchToHex(lch);
  }
  return out;
}

function snapIfPixel(v: number, step: number, preset: StylePreset): number {
  if (preset !== "pixel") return v;
  return Math.round(v / step) * step;
}

export const COLOR_STEP_KEYS = STEP_KEYS;
