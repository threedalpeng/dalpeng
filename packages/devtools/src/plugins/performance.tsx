import { ref, watch, type ReadonlyRef } from "@dalpeng/core";
import { defineUI } from "@dalpeng/ui";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

const HISTORY_LEN = 120;
const COLOR_GOOD = "var(--ui-color-success-text)";
const COLOR_WARN = "var(--ui-color-warning-text)";
const COLOR_BAD = "var(--ui-color-danger-text)";

function fpsColor(fps: number): string {
  if (fps > 55) return COLOR_GOOD;
  if (fps > 40) return COLOR_WARN;
  return COLOR_BAD;
}

function frameTimeColor(ms: number): string {
  if (ms < 16.7) return COLOR_GOOD;
  if (ms < 25) return COLOR_WARN;
  return COLOR_BAD;
}

interface SparklineProps {
  label: string;
  value: ReadonlyRef<number>;
  format: (v: number) => string;
  max?: number;
  color?: (v: number) => string;
}

function Sparkline({ label, value, format, max, color }: SparklineProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        paddingX: "$spacing.sm",
        paddingY: "$spacing.xs",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "$font.size.xs",
          color: "$color.text.secondary",
        }}
      >
        <span>{label}</span>
        <SparklineReadout value={value} format={format} />
      </div>
      <canvas
        ref={(el) => {
          const canvas = el as HTMLCanvasElement;
          canvas.width = HISTORY_LEN * 2;
          canvas.height = 32;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          const history: number[] = new Array(HISTORY_LEN).fill(0);
          let writeIdx = 0;
          const draw = (): void => {
            const w = canvas.width;
            const h = canvas.height;
            ctx.fillStyle = "rgba(255,255,255,0.04)";
            ctx.fillRect(0, 0, w, h);
            const normMax = max ?? Math.max(1, ...history);
            const barW = w / HISTORY_LEN;
            for (let i = 0; i < HISTORY_LEN; i++) {
              const idx = (writeIdx + i) % HISTORY_LEN;
              const v = history[idx];
              const norm = Math.max(0, Math.min(1, v / normMax));
              const barH = norm * (h - 2);
              ctx.fillStyle = color ? color(v) : COLOR_GOOD;
              ctx.fillRect(i * barW, h - barH, Math.max(1, barW - 0.5), barH);
            }
          };
          draw();
          return value.subscribe((v) => {
            history[writeIdx] = v;
            writeIdx = (writeIdx + 1) % HISTORY_LEN;
            draw();
          });
        }}
        style={{
          width: "100%",
          height: 32,
          display: "block",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}

function SparklineReadout({
  value,
  format,
}: {
  value: ReadonlyRef<number>;
  format: (v: number) => string;
}) {
  return (
    <span
      ref={(el) => {
        const span = el as HTMLSpanElement;
        const apply = (v: number): void => {
          span.textContent = format(v);
        };
        apply(value.value);
        return value.subscribe(apply);
      }}
      style={{
        color: "$color.text.primary",
        fontWeight: "$font.weight.semibold",
        fontVariantNumeric: "tabular-nums",
      }}
    />
  );
}

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
        ui: defineUI(() => (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "$font.size.xs",
            }}
          >
            <Sparkline
              label="FPS"
              value={fps}
              format={(v) => v.toFixed(0)}
              max={60}
              color={fpsColor}
            />
            <Sparkline
              label="frame time (ms)"
              value={frameTime}
              format={(v) => v.toFixed(2)}
              max={33}
              color={frameTimeColor}
            />
            <Sparkline label="draw calls" value={drawCalls} format={(v) => String(v)} />
            <Sparkline label="triangles" value={triangles} format={(v) => v.toLocaleString()} />
          </div>
        )),
      },
    ],
  });
}
