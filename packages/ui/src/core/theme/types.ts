// 11-step primitive scale — derived from a seed via OKLCH math.
export interface ColorSteps {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

// Semantic alias — each field resolves to a specific ColorSteps step (mode-dependent).
// Emitted as CSS var indirection so a primitive-step swap propagates automatically.
export interface ColorRole {
  bg: string;
  bgHover: string;
  fg: string;
  muted: string;
  mutedHover: string;
  border: string;
  text: string;
}

// Union of primitive steps + semantic aliases on the same scale.
export type ColorScale = ColorSteps & ColorRole;

export interface Surface {
  low: string;
  base: string;
  high: string;
}

export interface TextPalette {
  primary: string;
  secondary: string;
  muted: string;
  inverse: string;
}

// Augmentation slot — games extend via `declare module "@dalpeng/ui"`.
// Each added role should be a ColorScale to keep primitive + alias access uniform.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ThemeColorExtensions {}

export type ThemeColor = {
  primary: ColorScale;
  accent: ColorScale;
  neutral: ColorScale;
  success: ColorScale;
  warning: ColorScale;
  danger: ColorScale;
  info: ColorScale;

  surface: Surface;
  scrim: string;

  text: TextPalette;

  transparent: "transparent";
  current: "currentColor";
  black: string;
  white: string;
} & ThemeColorExtensions;

export type SpacingKey = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type RadiusKey = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "full";
export type ShadowKey = "none" | "sm" | "md" | "lg" | "xl";
export type FontSizeKey = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type FontWeightKey = "regular" | "medium" | "semibold" | "bold";
export type FontFamilyKey = "ui" | "mono" | "display";
export type LineHeightKey = "tight" | "normal" | "relaxed";
export type LetterSpacingKey = "tight" | "normal" | "wide";
export type DurationKey = "instant" | "fast" | "normal" | "slow";
export type EasingKey = "standard" | "emphasized" | "decelerate";
export type ZIndexKey = "base" | "raised" | "scrim" | "modal" | "popover" | "toast";

export interface FontTokens {
  size: Record<FontSizeKey, number>;
  weight: Record<FontWeightKey, number>;
  family: Record<FontFamilyKey, string>;
  lineHeight: Record<LineHeightKey, number>;
  letterSpacing: Record<LetterSpacingKey, number>;
  /** `"none"` disables font-smoothing for pixel-art. Matches CSS -webkit-font-smoothing semantics. */
  smoothing: "auto" | "none";
}

export interface MotionTokens {
  duration: Record<DurationKey, number>;
  easing: Record<EasingKey, string>;
}

export interface Theme {
  color: ThemeColor;
  spacing: Record<SpacingKey, number>;
  radius: Record<RadiusKey, number>;
  shadow: Record<ShadowKey, string>;
  font: FontTokens;
  motion: MotionTokens;
  zIndex: Record<ZIndexKey, number>;

  preset: StylePreset;
  mode: ColorMode;
}

export type StylePreset = "smooth" | "pixel";
export type ColorMode = "light" | "dark";

export interface ColorSeeds {
  primary?: string;
  accent?: string;
  neutral?: string;
  success?: string;
  warning?: string;
  danger?: string;
  info?: string;
}

export interface DefineThemeInput {
  base?: Theme;
  seeds?: ColorSeeds;
  preset?: StylePreset;
  mode?: ColorMode;
  overrides?: DeepPartial<Theme>;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
