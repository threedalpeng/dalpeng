import type { FontTokens, MotionTokens, StylePreset, Theme } from "./types";

// Shared — layout math doesn't differ across presets.
const SPACING: Theme["spacing"] = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
};

const Z_INDEX: Theme["zIndex"] = {
  base: 0,
  raised: 10,
  scrim: 100,
  modal: 101,
  popover: 200,
  toast: 1000,
};

// smooth preset — modern, anti-aliased, animated.
const SMOOTH_RADIUS: Theme["radius"] = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

const SMOOTH_SHADOW: Theme["shadow"] = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,.08)",
  md: "0 2px 6px rgba(0,0,0,.12)",
  lg: "0 8px 24px rgba(0,0,0,.16)",
  xl: "0 16px 40px rgba(0,0,0,.2)",
};

const SMOOTH_FONT: FontTokens = {
  size: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, "2xl": 28 },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  family: {
    ui: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    display: "system-ui, -apple-system, Segoe UI, sans-serif",
  },
  lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
  letterSpacing: { tight: -0.01, normal: 0, wide: 0.02 },
  smoothing: "auto",
};

const SMOOTH_MOTION: MotionTokens = {
  duration: { instant: 0, fast: 120, normal: 200, slow: 360 },
  easing: {
    standard: "cubic-bezier(.2, 0, 0, 1)",
    emphasized: "cubic-bezier(.2, 0, 0, 1.1)",
    decelerate: "cubic-bezier(0, 0, .2, 1)",
  },
};

// pixel preset — retro, sharp, non-animated.
const PIXEL_RADIUS: Theme["radius"] = {
  none: 0,
  xs: 0,
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  full: 0,
};

const PIXEL_SHADOW: Theme["shadow"] = {
  none: "none",
  sm: "none",
  md: "none",
  lg: "none",
  xl: "none",
};

const PIXEL_FONT: FontTokens = {
  size: { xs: 8, sm: 10, md: 12, lg: 14, xl: 18, "2xl": 24 },
  weight: { regular: 400, medium: 400, semibold: 700, bold: 700 },
  family: {
    ui: '"Press Start 2P", "VT323", monospace',
    mono: '"Press Start 2P", "VT323", monospace',
    display: '"Press Start 2P", "VT323", monospace',
  },
  lineHeight: { tight: 1, normal: 1.2, relaxed: 1.5 },
  letterSpacing: { tight: 0, normal: 0.05, wide: 0.1 },
  smoothing: "none",
};

const PIXEL_MOTION: MotionTokens = {
  duration: { instant: 0, fast: 0, normal: 0, slow: 0 },
  easing: {
    standard: "steps(1, end)",
    emphasized: "steps(1, end)",
    decelerate: "steps(1, end)",
  },
};

export interface PresetTokens {
  radius: Theme["radius"];
  shadow: Theme["shadow"];
  font: FontTokens;
  motion: MotionTokens;
  spacing: Theme["spacing"];
  zIndex: Theme["zIndex"];
}

export function presetTokens(preset: StylePreset): PresetTokens {
  if (preset === "pixel") {
    return {
      radius: PIXEL_RADIUS,
      shadow: PIXEL_SHADOW,
      font: PIXEL_FONT,
      motion: PIXEL_MOTION,
      spacing: SPACING,
      zIndex: Z_INDEX,
    };
  }
  return {
    radius: SMOOTH_RADIUS,
    shadow: SMOOTH_SHADOW,
    font: SMOOTH_FONT,
    motion: SMOOTH_MOTION,
    spacing: SPACING,
    zIndex: Z_INDEX,
  };
}
