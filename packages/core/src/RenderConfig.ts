import type { Ref } from "./runtime/flow";

/**
 * Configuration surface — the value shape users pass to `withFeatures` or `app.configure`.
 * At runtime, `Application.features` is a `FeatureState` (per-field Ref) rather than
 * a plain `RenderConfig` so every mutation flows through the standard Ref protocol:
 * writes notify subscribers, DevTools binds directly, no polling/Proxy/interception.
 */
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
  bloomThreshold?: number; // luminance threshold (default 1.0)
  bloomIntensity?: number; // additive blend strength (default 0.5)
  bloomRadius?: number; // blur iterations (default 5)
  // Texture map toggle mask (bit flags: 1=baseColor, 2=normal, 4=metallicRoughness, 8=emissive)
  textureMask?: number;
  // Ambient light
  ambientColor?: [number, number, number];
  ambientIntensity?: number;
  // IBL
  ibl?: boolean;
  iblIntensity?: number; // default 1.0
  iblHdrUrl?: string; // .hdr file path
  // SSAO
  ssao?: boolean;
  ssaoRadius?: number; // default 0.5
  ssaoBias?: number; // default 0.025
  ssaoKernelSize?: number; // 16 | 32 | 64, default 64
  // Skybox
  skybox?: boolean; // default = ibl
  skyboxExposure?: number; // default = toneExposure
  // FXAA
  fxaa?: boolean;
  // Debug profiling
  debugProfiler?: boolean;
  debugLogger?: boolean;
  debugLogLevel?: "trace" | "debug" | "info" | "warn" | "error";
}

/**
 * Runtime form of `RenderConfig` — each field is a `Ref` so mutations are
 * observable by DevTools / game code via the standard reactive protocol.
 * Read: `app.features.bloom.value`. Write: `app.features.bloom.value = true`.
 */
export type FeatureState = {
  readonly [K in keyof RenderConfig]-?: Ref<RenderConfig[K]>;
};
