// Standard easing functions: t is [0, 1], returns [0, 1]
export type EasingFn = (t: number) => number;

// Linear
export const linear: EasingFn = (t) => t;

// Quad
export const easeInQuad: EasingFn = (t) => t * t;
export const easeOutQuad: EasingFn = (t) => t * (2 - t);
export const easeInOutQuad: EasingFn = (t) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

// Cubic
export const easeInCubic: EasingFn = (t) => t * t * t;
export const easeOutCubic: EasingFn = (t) => (t - 1) * (t - 1) * (t - 1) + 1;
export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5
    ? 4 * t * t * t
    : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

// Quart
export const easeInQuart: EasingFn = (t) => t * t * t * t;
export const easeOutQuart: EasingFn = (t) => 1 - (t - 1) * (t - 1) * (t - 1) * (t - 1);
export const easeInOutQuart: EasingFn = (t) =>
  t < 0.5
    ? 8 * t * t * t * t
    : 1 - 8 * (t - 1) * (t - 1) * (t - 1) * (t - 1);

// Quint
export const easeInQuint: EasingFn = (t) => t * t * t * t * t;
export const easeOutQuint: EasingFn = (t) =>
  1 + (t - 1) * (t - 1) * (t - 1) * (t - 1) * (t - 1);
export const easeInOutQuint: EasingFn = (t) =>
  t < 0.5
    ? 16 * t * t * t * t * t
    : 1 + 16 * (t - 1) * (t - 1) * (t - 1) * (t - 1) * (t - 1);

// Sine
export const easeInSine: EasingFn = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine: EasingFn = (t) => Math.sin((t * Math.PI) / 2);
export const easeInOutSine: EasingFn = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

// Expo
export const easeInExpo: EasingFn = (t) =>
  t === 0 ? 0 : Math.pow(2, 10 * t - 10);
export const easeOutExpo: EasingFn = (t) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
export const easeInOutExpo: EasingFn = (t) =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : t < 0.5
        ? Math.pow(2, 20 * t - 10) / 2
        : (2 - Math.pow(2, -20 * t + 10)) / 2;

// Circ
export const easeInCirc: EasingFn = (t) => 1 - Math.sqrt(1 - t * t);
export const easeOutCirc: EasingFn = (t) => Math.sqrt(1 - (t - 1) * (t - 1));
export const easeInOutCirc: EasingFn = (t) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
    : (Math.sqrt(1 - (2 * t - 2) * (2 * t - 2)) + 1) / 2;

// Elastic
const ELASTIC_PERIOD = (2 * Math.PI) / 3;
const ELASTIC_PERIOD_HALF = (2 * Math.PI) / 4.5;

export const easeInElastic: EasingFn = (t) =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : -Math.pow(2, 10 * t - 10) *
        Math.sin((t * 10 - 10.75) * ELASTIC_PERIOD);
export const easeOutElastic: EasingFn = (t) =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ELASTIC_PERIOD) + 1;
export const easeInOutElastic: EasingFn = (t) =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : t < 0.5
        ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * ELASTIC_PERIOD_HALF)) / 2
        : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * ELASTIC_PERIOD_HALF)) / 2 + 1;

// Back
const BACK_C1 = 1.70158;
const BACK_C2 = BACK_C1 * 1.525;
const BACK_C3 = BACK_C1 + 1;

export const easeInBack: EasingFn = (t) =>
  BACK_C3 * t * t * t - BACK_C1 * t * t;
export const easeOutBack: EasingFn = (t) =>
  1 + BACK_C3 * (t - 1) * (t - 1) * (t - 1) + BACK_C1 * (t - 1) * (t - 1);
export const easeInOutBack: EasingFn = (t) =>
  t < 0.5
    ? ((2 * t) * (2 * t) * ((BACK_C2 + 1) * 2 * t - BACK_C2)) / 2
    : ((2 * t - 2) * (2 * t - 2) * ((BACK_C2 + 1) * (2 * t - 2) + BACK_C2) + 2) / 2;

// Bounce
export const easeOutBounce: EasingFn = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    const t2 = t - 1.5 / d1;
    return n1 * t2 * t2 + 0.75;
  } else if (t < 2.5 / d1) {
    const t2 = t - 2.25 / d1;
    return n1 * t2 * t2 + 0.9375;
  } else {
    const t2 = t - 2.625 / d1;
    return n1 * t2 * t2 + 0.984375;
  }
};
export const easeInBounce: EasingFn = (t) => 1 - easeOutBounce(1 - t);
export const easeInOutBounce: EasingFn = (t) =>
  t < 0.5
    ? (1 - easeOutBounce(1 - 2 * t)) / 2
    : (1 + easeOutBounce(2 * t - 1)) / 2;

// Export all as object
export const Easings = {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
} as const;
