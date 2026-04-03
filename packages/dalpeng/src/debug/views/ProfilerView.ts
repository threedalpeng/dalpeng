import type { DebugView } from "../panel";
import { FrameProfiler } from "@dalpeng/core";
import type { Application } from "@dalpeng/core";

// Color palette for passes
const PASS_COLORS: Record<string, string> = {
  shadow: "#8b5cf6", // purple
  geometry: "#3b82f6", // blue
  ssao: "#06b6d4", // cyan
  "ssao-blur": "#14b8a6", // teal
  lighting: "#f59e0b", // amber
  skybox: "#10b981", // emerald
  particles: "#ec4899", // pink
  post: "#ef4444", // red
};
const DEFAULT_COLOR = "#6b7280"; // gray

export default class ProfilerView implements DebugView {
  id = "profiler";
  label = "Prof";
  shortcut = "3";

  #canvas!: HTMLCanvasElement;
  #ctx!: CanvasRenderingContext2D;
  #summaryEl!: HTMLElement;
  #passTable!: HTMLElement;
  #totalsEl!: HTMLElement;
  #lastUpdate = 0;

  mount(container: HTMLElement, _app: Application): void {
    container.style.padding = "8px";

    // Summary line: FPS + frame time
    this.#summaryEl = document.createElement("div");
    this.#summaryEl.style.marginBottom = "8px";
    this.#summaryEl.style.fontSize = "12px";
    container.appendChild(this.#summaryEl);

    // Canvas for frame time graph
    this.#canvas = document.createElement("canvas");
    this.#canvas.width = 310;
    this.#canvas.height = 60;
    this.#canvas.style.width = "100%";
    this.#canvas.style.height = "60px";
    this.#canvas.style.borderRadius = "4px";
    this.#canvas.style.background = "rgba(0,0,0,0.3)";
    this.#canvas.style.marginBottom = "10px";
    this.#ctx = this.#canvas.getContext("2d")!;
    container.appendChild(this.#canvas);

    // Pass breakdown heading
    const heading = document.createElement("div");
    heading.textContent = "Pass Breakdown";
    heading.style.fontWeight = "600";
    heading.style.marginBottom = "6px";
    heading.style.borderBottom = "1px solid rgba(255,255,255,0.12)";
    heading.style.paddingBottom = "4px";
    container.appendChild(heading);

    // Pass table (dynamically populated)
    this.#passTable = document.createElement("div");
    container.appendChild(this.#passTable);

    // Totals line
    this.#totalsEl = document.createElement("div");
    this.#totalsEl.style.marginTop = "8px";
    this.#totalsEl.style.paddingTop = "6px";
    this.#totalsEl.style.borderTop = "1px solid rgba(255,255,255,0.12)";
    this.#totalsEl.style.color = "rgba(255,255,255,0.7)";
    container.appendChild(this.#totalsEl);
  }

  unmount(): void {}

  update(): void {
    const now = performance.now();
    if (now - this.#lastUpdate < 200) return;
    this.#lastUpdate = now;

    const fps = FrameProfiler.getAverageFPS();
    const minFps = FrameProfiler.getMinFPS();
    const frameTime = FrameProfiler.getAverageFrameTime();
    this.#summaryEl.textContent = `FPS: ${fps} avg / ${minFps} min   Frame: ${frameTime.toFixed(1)}ms`;

    // Draw frame time graph
    this.#drawGraph();

    // Update pass breakdown
    this.#updatePasses();

    // Update totals
    const last = FrameProfiler.getLastFrame();
    if (last) {
      const dc = last.totalDrawCalls;
      const tri = last.totalTriangles;
      const triStr = tri >= 1000 ? (tri / 1000).toFixed(1) + "k" : String(tri);
      this.#totalsEl.textContent = `Draw Calls: ${dc}   Triangles: ${triStr}`;
    }
  }

  #drawGraph(): void {
    const ctx = this.#ctx;
    const w = this.#canvas.width;
    const h = this.#canvas.height;
    const history = FrameProfiler.getHistory();

    ctx.clearRect(0, 0, w, h);

    if (history.length < 2) return;

    const maxTime = 33.33; // cap at 30fps (33ms) for scale

    // 16.67ms reference line (60fps target)
    const refY = h - (16.67 / maxTime) * h;
    ctx.strokeStyle = "rgba(66, 133, 244, 0.3)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, refY);
    ctx.lineTo(w, refY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw bars for each frame
    const barWidth = w / 120;
    const startIdx = Math.max(0, history.length - 120);

    for (let i = startIdx; i < history.length; i++) {
      const frame = history[i];
      const x = (i - startIdx) * barWidth;
      const barH = Math.min((frame.totalTime / maxTime) * h, h);
      const y = h - barH;

      // Color based on frame time
      if (frame.totalTime <= 16.67) {
        ctx.fillStyle = "#4caf50"; // green (60fps+)
      } else if (frame.totalTime <= 33.33) {
        ctx.fillStyle = "#ff9800"; // orange (30-60fps)
      } else {
        ctx.fillStyle = "#f44336"; // red (<30fps)
      }

      ctx.fillRect(x, y, barWidth - 0.5, barH);
    }
  }

  #updatePasses(): void {
    const last = FrameProfiler.getLastFrame();
    if (!last || last.passes.length === 0) return;

    const totalTime = Math.max(last.totalTime, 0.001);

    // Build pass rows
    this.#passTable.innerHTML = "";

    for (const pass of last.passes) {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "90px 1fr 50px 35px";
      row.style.alignItems = "center";
      row.style.gap = "6px";
      row.style.marginBottom = "3px";
      row.style.fontSize = "11px";

      // Name
      const name = document.createElement("span");
      name.textContent = pass.name;
      name.style.color = PASS_COLORS[pass.name] ?? DEFAULT_COLOR;

      // Bar
      const barWrap = document.createElement("div");
      barWrap.style.height = "6px";
      barWrap.style.borderRadius = "3px";
      barWrap.style.background = "rgba(255,255,255,0.08)";
      const bar = document.createElement("div");
      const pct = Math.min((pass.duration / totalTime) * 100, 100);
      bar.style.width = pct + "%";
      bar.style.height = "100%";
      bar.style.borderRadius = "3px";
      bar.style.background = PASS_COLORS[pass.name] ?? DEFAULT_COLOR;
      barWrap.appendChild(bar);

      // Time
      const time = document.createElement("span");
      time.style.textAlign = "right";
      time.textContent = pass.duration.toFixed(1) + "ms";

      // Percentage
      const pctEl = document.createElement("span");
      pctEl.style.textAlign = "right";
      pctEl.style.color = "rgba(255,255,255,0.5)";
      pctEl.textContent = Math.round(pct) + "%";

      row.appendChild(name);
      row.appendChild(barWrap);
      row.appendChild(time);
      row.appendChild(pctEl);

      this.#passTable.appendChild(row);
    }
  }
}
