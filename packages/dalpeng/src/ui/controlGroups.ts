import type { Application } from "@dalpeng/core";
import type { NodeDescriptor } from "./types";
import { defineToggle, defineRange, defineSelect, defineButton, defineValue } from "./define";
import { ref } from "../reactive";

// ─── Interface ──────────────────────────────────────────────────────────────

export interface ControlGroup {
  id: string;
  label: string;
  priority?: number;
  /** New-style: returns NodeDescriptor[] via defineXXX calls */
  _setup: () => NodeDescriptor[];
  /** Optional per-frame update (for animation group etc.) */
  update?: (app: Application) => void;
  /** Internal: cleanup functions from reactive subscriptions */
  _cleanups?: Set<() => void>;
}

export function defineControlGroup(
  label: string,
  setup: () => NodeDescriptor[],
  opts?: {
    id?: string;
    priority?: number;
    update?: (app: Application) => void;
  }
): ControlGroup {
  return {
    id: opts?.id ?? label.toLowerCase().replace(/\s+/g, "-"),
    label,
    priority: opts?.priority,
    _setup: setup,
    update: opts?.update,
  };
}

// ─── Built-in Groups ────────────────────────────────────────────────────────

export const LIGHTING_VIEWS_GROUP = defineControlGroup(
  "Views",
  () => [
    defineSelect("debugLightingView", "View", [
      { value: "0", label: "Shaded" },
      { value: "1", label: "Normals" },
      { value: "2", label: "Albedo" },
      { value: "3", label: "Emissive" },
      { value: "4", label: "Metallic" },
      { value: "5", label: "Roughness" },
      { value: "6", label: "Position" },
      { value: "7", label: "SSAO" },
      { value: "8", label: "Combined AO" },
    ]),
  ],
  { id: "lighting-views", priority: 100 }
);

export const TONE_MAPPING_GROUP = defineControlGroup(
  "Tone Mapping",
  () => [
    defineToggle("postToneMapping", "Enable (T)"),
    defineRange("toneExposure", "Exposure", { min: 0, max: 4, step: 0.01 }),
    defineRange("toneGamma", "Gamma", { min: 1.2, max: 3, step: 0.01 }),
  ],
  { id: "tone-mapping", priority: 110 }
);

export const SHADOWS_GROUP = defineControlGroup(
  "Shadows",
  () => [
    defineToggle("shadows", "Enable"),
    defineRange("shadowBias", "Bias", { min: 0, max: 0.05, step: 0.001 }),
    defineRange("shadowSlopeScale", "Slope Scale", { min: 0, max: 5, step: 0.01 }),
    defineRange("shadowStrength", "Strength", { min: 0, max: 1, step: 0.01 }),
    defineRange("shadowMapSize", "Map Size", { min: 128, max: 4096, step: 128 }),
    defineRange("shadowDistance", "Max Dist (0=auto)", { min: 0, max: 200, step: 1 }),
    defineSelect("shadowDebug", "Debug", [
      { value: "0", label: "Off" },
      { value: "1", label: "Visibility" },
      { value: "2", label: "UV+Depth" },
    ]),
  ],
  { id: "shadows", priority: 120 }
);

export const BLOOM_GROUP = defineControlGroup(
  "Bloom",
  () => [
    defineToggle("bloom", "Enable"),
    defineRange("bloomThreshold", "Threshold", { min: 0, max: 3, step: 0.01 }),
    defineRange("bloomIntensity", "Intensity", { min: 0, max: 2, step: 0.01 }),
    defineRange("bloomRadius", "Radius (iters)", { min: 1, max: 10, step: 1 }),
  ],
  { id: "bloom", priority: 130 }
);

export const IBL_GROUP = defineControlGroup(
  "IBL",
  () => [
    defineToggle("ibl", "Enable"),
    defineRange("iblIntensity", "Intensity", { min: 0, max: 5, step: 0.01 }),
    defineToggle("skybox", "Skybox"),
    defineRange("skyboxExposure", "Skybox Exposure", { min: 0, max: 5, step: 0.01 }),
  ],
  { id: "ibl", priority: 140 }
);

export const SSAO_GROUP = defineControlGroup(
  "SSAO",
  () => [
    defineToggle("ssao", "Enable"),
    defineRange("ssaoRadius", "Radius", { min: 0.05, max: 5, step: 0.01 }),
    defineRange("ssaoBias", "Bias", { min: 0, max: 0.1, step: 0.001 }),
    defineSelect("ssaoKernelSize", "Kernel Size", [
      { value: "16", label: "16" },
      { value: "32", label: "32" },
      { value: "64", label: "64" },
    ]),
  ],
  { id: "ssao", priority: 150 }
);

export const FXAA_GROUP = defineControlGroup(
  "FXAA",
  () => [defineToggle("fxaa", "Enable")],
  { id: "fxaa", priority: 160 }
);

// Animation group uses refs for dynamic values + update callback
const _animClipName = ref("-");
const _animTime = ref("-");
const _animPlaying = ref("-");
const _animClip = ref("-1");

export const ANIMATION_GROUP = defineControlGroup(
  "Animation",
  () => [
    defineValue("Clip", _animClipName),
    defineValue("Time", _animTime),
    defineValue("Playing", _animPlaying),
    defineSelect(_animClip, "Select Clip", [{ value: "-1", label: "(none)" }]),
    defineRange("animSpeed", "Speed", { min: 0, max: 3, step: 0.01 }),
    defineButton("Play", () => {}),
    defineButton("Pause", () => {}),
    defineButton("Stop", () => {}),
  ],
  {
    id: "animation",
    priority: 170,
    update: (app) => {
      const animators = app.activeComponents.get("Animator");
      const animator = animators && animators.size > 0
        ? (animators.values().next().value as any)
        : null;

      if (animator) {
        const clipIdx = animator.currentClipIndex;
        _animClipName.value =
          clipIdx >= 0 && clipIdx < animator.clips.length
            ? animator.clips[clipIdx].name || `Clip ${clipIdx}`
            : "-";
        _animTime.value = animator.currentTime.toFixed(2) + "s";
        _animPlaying.value = animator.isPlaying ? "Yes" : "No";
      } else {
        _animClipName.value = "-";
        _animTime.value = "-";
        _animPlaying.value = "-";
      }
    },
  }
);

/** All built-in render control groups. */
export const ALL_RENDER_GROUPS: ControlGroup[] = [
  LIGHTING_VIEWS_GROUP,
  TONE_MAPPING_GROUP,
  SHADOWS_GROUP,
  BLOOM_GROUP,
  IBL_GROUP,
  SSAO_GROUP,
  FXAA_GROUP,
  ANIMATION_GROUP,
];
