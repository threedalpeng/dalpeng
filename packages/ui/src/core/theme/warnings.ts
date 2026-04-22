import { contrastRatio, hexToOklch } from "./oklch";
import type { ColorMode, Theme, ThemeColor } from "./types";

const AA_NORMAL = 4.5;
const HUE_PROXIMITY_THRESHOLD = 30; // degrees

const CHECKED_ROLES: (keyof Pick<
  ThemeColor,
  "primary" | "accent" | "success" | "warning" | "danger" | "info"
>)[] = ["primary", "accent", "success", "warning", "danger", "info"];

/**
 * Dev-only audit — logs warnings for contrast failures and hue collisions.
 * Call after `defineTheme`. Safe to skip in production (tree-shakeable).
 */
export function auditTheme(theme: Theme): void {
  auditContrast(theme);
  auditHueCollisions(theme);
}

function auditContrast(theme: Theme): void {
  for (const role of CHECKED_ROLES) {
    const { bg, fg } = theme.color[role];
    const ratio = contrastRatio(bg, fg);
    if (ratio < AA_NORMAL) {
      console.warn(
        `[theme] ${role}.fg vs ${role}.bg contrast ${ratio.toFixed(2)}:1 — below WCAG AA (4.5:1)`
      );
    }
  }
}

function auditHueCollisions(theme: Theme): void {
  const hues = CHECKED_ROLES.map((r) => ({
    role: r,
    H: hexToOklch(theme.color[r][500]).H,
  }));
  for (let i = 0; i < hues.length; i++) {
    for (let j = i + 1; j < hues.length; j++) {
      const dist = hueDistance(hues[i].H, hues[j].H);
      if (dist < HUE_PROXIMITY_THRESHOLD) {
        console.warn(
          `[theme] ${hues[i].role} and ${hues[j].role} hues differ by only ${dist.toFixed(0)}° — visually close, consider adjusting seeds`
        );
      }
    }
  }
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Mode-aware comparator — avoids `light` vs `dark` seed mixup in extendTheme. */
export function assertModeMatch(a: ColorMode, b: ColorMode): void {
  if (a !== b) {
    console.warn(
      `[theme] extending a ${a}-mode theme with ${b}-mode overrides — visual drift likely`
    );
  }
}
