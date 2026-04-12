import { ref, watch } from "@dalpeng/core";
import { Bar, Text, defineUI, useLayout } from "@dalpeng/ui";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

export function performancePlugin(): DevToolsPlugin {
  const fps = ref(0);
  const frameTime = ref(0);
  const drawCalls = ref(0);
  const triangles = ref(0);

  return definePlugin({
    name: "@dalpeng/devtools/performance",
    version: "0.1.0",

    setup(host) {
      return watch(
        host.frameStats,
        (s) => {
          fps.value = s.fps;
          frameTime.value = s.frameTime;
          drawCalls.value = s.drawCalls;
          triangles.value = s.triangles;
        },
        { immediate: true }
      );
    },

    panels: [
      {
        id: "perf",
        title: "Perf",
        defaultDock: "bottom",
        ui: defineUI(() => {
          useLayout("column", { gap: 6 });
          return [
            Text(fps, (v) => `${v.toFixed(0)} fps`, {
              size: 28,
              bold: true,
            }),
            Bar(fps, (v) => Math.min(1, v / 60), {
              width: 240,
              height: 6,
              color: (v) => (v > 0.8 ? "#7be0a1" : v > 0.5 ? "#e8c372" : "#e26b6b"),
              bgColor: "#2a2e35",
            }),
            Text(frameTime, (v) => `frame time:  ${v.toFixed(2)} ms`),
            Text(drawCalls, (v) => `draw calls:  ${v}`),
            Text(triangles, (v) => `triangles:   ${v.toLocaleString()}`),
          ];
        }),
      },
    ],
  });
}
