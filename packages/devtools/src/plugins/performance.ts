import { watch } from "@dalpeng/core";
import { defineUI, type UIChild } from "@dalpeng/ui";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

const HISTORY_LEN = 120;
const COLORS = {
  fg: "#e6e8ec",
  fgMuted: "#9ba3b0",
  fgDim: "#6b7280",
  good: "#7be0a1",
  warn: "#e8c372",
  bad: "#e26b6b",
  grid: "rgba(255,255,255,0.04)",
};

function fpsColor(fps: number): string {
  if (fps > 55) return COLORS.good;
  if (fps > 40) return COLORS.warn;
  return COLORS.bad;
}

interface Sparkline {
  element: HTMLElement;
  push(value: number): void;
}

function buildSparkline(opts: {
  label: string;
  formatter: (v: number) => string;
  max?: number;
  color?: (v: number) => string;
}): Sparkline {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:2px;padding:4px 8px";

  const labelRow = document.createElement("div");
  labelRow.style.cssText = `display:flex;justify-content:space-between;font-size:10px;color:${COLORS.fgMuted}`;
  const labelEl = document.createElement("span");
  labelEl.textContent = opts.label;
  const valueEl = document.createElement("span");
  valueEl.style.cssText = `color:${COLORS.fg};font-weight:600;font-variant-numeric:tabular-nums`;
  labelRow.appendChild(labelEl);
  labelRow.appendChild(valueEl);
  wrap.appendChild(labelRow);

  const canvas = document.createElement("canvas");
  canvas.width = HISTORY_LEN * 2;
  canvas.height = 32;
  canvas.style.cssText = "width:100%;height:32px;display:block;image-rendering:pixelated";
  wrap.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;

  const history: number[] = new Array(HISTORY_LEN).fill(0);
  let writeIdx = 0;

  function draw(): void {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = COLORS.grid;
    ctx.fillRect(0, 0, w, h);

    const max = opts.max ?? Math.max(1, ...history);
    const barW = w / HISTORY_LEN;

    for (let i = 0; i < HISTORY_LEN; i++) {
      const idx = (writeIdx + i) % HISTORY_LEN;
      const v = history[idx];
      const norm = Math.max(0, Math.min(1, v / max));
      const barH = norm * (h - 2);
      ctx.fillStyle = opts.color ? opts.color(v) : COLORS.good;
      ctx.fillRect(i * barW, h - barH, Math.max(1, barW - 0.5), barH);
    }
  }

  draw();

  return {
    element: wrap,
    push(value: number): void {
      history[writeIdx] = value;
      writeIdx = (writeIdx + 1) % HISTORY_LEN;
      valueEl.textContent = opts.formatter(value);
      draw();
    },
  };
}

export function performancePlugin(): DevToolsPlugin {
  const fpsLine = buildSparkline({
    label: "FPS",
    formatter: (v) => v.toFixed(0),
    max: 60,
    color: fpsColor,
  });
  const msLine = buildSparkline({
    label: "frame time (ms)",
    formatter: (v) => v.toFixed(2),
    max: 33,
    color: (v) => (v < 16.7 ? COLORS.good : v < 25 ? COLORS.warn : COLORS.bad),
  });
  const drawLine = buildSparkline({
    label: "draw calls",
    formatter: (v) => String(v),
  });
  const triLine = buildSparkline({
    label: "triangles",
    formatter: (v) => v.toLocaleString(),
  });

  const root = document.createElement("div");
  root.style.cssText = "display:flex;flex-direction:column;font-size:11px";
  root.appendChild(fpsLine.element);
  root.appendChild(msLine.element);
  root.appendChild(drawLine.element);
  root.appendChild(triLine.element);

  const rootNode: UIChild = { type: "live", element: root, cleanups: new Set() };

  return definePlugin({
    name: "@dalpeng/devtools/performance",
    version: "0.1.0",

    setup(host) {
      return watch(
        host.frameStats,
        (s) => {
          fpsLine.push(s.fps);
          msLine.push(s.frameTime);
          drawLine.push(s.drawCalls);
          triLine.push(s.triangles);
        },
        { immediate: true }
      );
    },

    panels: [
      {
        id: "perf",
        title: "Perf",
        defaultDock: "bottom",
        ui: defineUI(() => [rootNode]),
      },
    ],
  });
}
