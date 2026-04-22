import { contrastRatio } from "./oklch";
import type { ColorMode, ColorRole, ColorScale, ColorSteps } from "./types";

// Step indices keyed by role field, per mode. Step 500 is the brand anchor in
// light mode; dark mode lifts `bg` one step brighter so primary-on-dark
// doesn't feel oversaturated.
const LIGHT_MAP: Record<keyof ColorRole, keyof ColorSteps> = {
  bg: 500,
  bgHover: 600,
  fg: 50,
  muted: 100,
  mutedHover: 200,
  border: 300,
  text: 700,
};

const DARK_MAP: Record<keyof ColorRole, keyof ColorSteps> = {
  bg: 400,
  bgHover: 300,
  fg: 950,
  muted: 900,
  mutedHover: 800,
  border: 700,
  text: 300,
};

const AA_NORMAL = 4.5;

export function deriveAliases(steps: ColorSteps, mode: ColorMode): ColorRole {
  const map = mode === "light" ? LIGHT_MAP : DARK_MAP;
  const alias = {} as ColorRole;
  (Object.keys(map) as (keyof ColorRole)[]).forEach((key) => {
    alias[key] = steps[map[key]];
  });
  // `fg` is the high-risk slot — ensure AA against bg. If palette-picked step
  // doesn't clear 4.5:1, fall back to pure white / black for guaranteed contrast.
  if (contrastRatio(alias.fg, alias.bg) < AA_NORMAL) {
    alias.fg = pickContrastFirst(alias.bg);
  }
  return alias;
}

export function composeScale(steps: ColorSteps, mode: ColorMode): ColorScale {
  return { ...steps, ...deriveAliases(steps, mode) };
}

function pickContrastFirst(bg: string): string {
  const vsWhite = contrastRatio(bg, "#ffffff");
  const vsBlack = contrastRatio(bg, "#000000");
  return vsWhite >= vsBlack ? "#ffffff" : "#000000";
}
