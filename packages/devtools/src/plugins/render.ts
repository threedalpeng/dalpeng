import {
  Range,
  Select,
  Toggle,
  defineUI,
  feature,
  useLayout,
  type BindingSource,
} from "@dalpeng/ui";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

export function renderPlugin(): DevToolsPlugin {
  return definePlugin({
    name: "@dalpeng/devtools/render",
    version: "0.1.0",

    panels: [
      {
        id: "render",
        title: "Render",
        defaultDock: "right",
        ui: defineUI(() => {
          useLayout("column", { gap: 10 });
          return [
            Select(feature("debugLightingView") as unknown as BindingSource<string>, "lighting view", [
              { value: "0", label: "Composite" },
              { value: "1", label: "Albedo" },
              { value: "2", label: "Normal" },
              { value: "3", label: "Position" },
              { value: "4", label: "Emissive" },
              { value: "5", label: "Depth" },
              { value: "6", label: "AO" },
            ]),
            Toggle(feature("postToneMapping"), "tone mapping"),
            Range(feature("toneExposure"), "exposure", { min: 0, max: 4, step: 0.05 }),
            Range(feature("toneGamma"), "gamma", { min: 1, max: 3, step: 0.05 }),
            Toggle(feature("shadows"), "shadows"),
            Range(feature("shadowStrength"), "strength", { min: 0, max: 1, step: 0.05 }),
            Range(feature("shadowBias"), "bias", { min: 0, max: 0.01, step: 0.0001 }),
            Toggle(feature("ibl"), "IBL"),
            Range(feature("iblIntensity"), "IBL intensity", { min: 0, max: 4, step: 0.05 }),
            Toggle(feature("ssao"), "SSAO"),
            Range(feature("ssaoRadius"), "SSAO radius", { min: 0, max: 2, step: 0.05 }),
            Toggle(feature("bloom"), "bloom"),
            Range(feature("bloomThreshold"), "bloom threshold", {
              min: 0,
              max: 4,
              step: 0.05,
            }),
            Range(feature("bloomIntensity"), "bloom intensity", {
              min: 0,
              max: 2,
              step: 0.05,
            }),
            Toggle(feature("fxaa"), "FXAA"),
          ];
        }),
      },
    ],
  });
}
