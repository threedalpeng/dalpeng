export interface RenderConfig {
  postToneMapping: boolean;
  debugGL?: boolean;
  debugGLVerbose?: boolean;
  debugLightingView?: number;
  toneExposure?: number;
  toneGamma?: number;
  shadows?: boolean;
  shadowBias?: number;
  shadowStrength?: number;
  shadowMapSize?: number;
  shadowSlopeScale?: number;
  shadowOffsetFactor?: number;
  shadowOffsetUnits?: number;
  shadowDebug?: number;
  shadowDistance?: number;
  // Bloom
  bloom?: boolean;
  bloomThreshold?: number;   // luminance threshold (default 1.0)
  bloomIntensity?: number;   // additive blend strength (default 0.5)
  bloomRadius?: number;      // blur iterations (default 5)
}
