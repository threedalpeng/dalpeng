import { composeScale } from "./aliases";
import { deriveColorSteps } from "./scale";
import type { ColorMode, ColorScale, StylePreset } from "./types";

export interface ToColorRoleOptions {
  preset?: StylePreset;
  mode?: ColorMode;
}

/**
 * Produce a full ColorScale (11 primitive steps + 7 semantic aliases) from
 * a single seed color. Used by `defineTheme` for each built-in role, and
 * exported publicly so games can define custom roles via augmentation.
 */
export function toColorRole(seed: string, opts?: ToColorRoleOptions): ColorScale {
  const mode = opts?.mode ?? "light";
  const preset = opts?.preset ?? "smooth";
  const steps = deriveColorSteps(seed, mode, preset);
  return composeScale(steps, mode);
}
