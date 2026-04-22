// Pure OKLCH math. No DOM dependency. Formulas from Björn Ottosson (2020).
// https://bottosson.github.io/posts/oklab/

export interface OKLCH {
  L: number; // 0..1
  C: number; // ~0..0.37 practical range
  H: number; // 0..360 degrees
}

export interface RGB {
  r: number; // 0..1
  g: number; // 0..1
  b: number; // 0..1
}

export function oklchToHex(lch: OKLCH): string {
  const rgb = oklchToSrgb(lch);
  return rgbToHex(rgb);
}

export function hexToOklch(hex: string): OKLCH {
  const rgb = hexToRgb(hex);
  return srgbToOklch(rgb);
}

export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length !== 6) throw new Error(`hexToRgb: invalid hex "${hex}"`);
  const n = parseInt(h, 16);
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
  };
}

export function rgbToHex(rgb: RGB): string {
  const to = (v: number): string => {
    const clamped = Math.max(0, Math.min(1, v));
    const int = Math.round(clamped * 255);
    return int.toString(16).padStart(2, "0");
  };
  return `#${to(rgb.r)}${to(rgb.g)}${to(rgb.b)}`;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

interface OKLab {
  L: number;
  a: number;
  b: number;
}

function srgbToOklab(rgb: RGB): OKLab {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklabToSrgb(lab: OKLab): RGB {
  const l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return { r: linearToSrgb(r), g: linearToSrgb(g), b: linearToSrgb(b) };
}

export function srgbToOklch(rgb: RGB): OKLCH {
  const lab = srgbToOklab(rgb);
  const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let H = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L: lab.L, C, H };
}

export function oklchToSrgb(lch: OKLCH): RGB {
  const hRad = (lch.H * Math.PI) / 180;
  const lab: OKLab = {
    L: lch.L,
    a: Math.cos(hRad) * lch.C,
    b: Math.sin(hRad) * lch.C,
  };
  return oklabToSrgb(lab);
}

/** Relative luminance (WCAG). Used for contrast ratio calc. */
function relativeLuminance(rgb: RGB): number {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio — returns value in [1, 21]. AA requires ≥ 4.5 for normal text. */
export function contrastRatio(aHex: string, bHex: string): number {
  const a = relativeLuminance(hexToRgb(aHex));
  const b = relativeLuminance(hexToRgb(bHex));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
