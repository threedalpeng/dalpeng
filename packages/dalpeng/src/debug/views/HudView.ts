import type { DebugView } from "../panel";
import { FrameProfiler, ErrorTracker } from "@dalpeng/core";
import type { Application } from "@dalpeng/core";

export default class HudView implements DebugView {
  id = "hud";
  label = "HUD";
  shortcut = "1";

  #fpsEl!: HTMLElement;
  #frameTimeEl!: HTMLElement;
  #drawCallsEl!: HTMLElement;
  #trianglesEl!: HTMLElement;
  #errorsEl!: HTMLElement;
  #unsubscribe: (() => void) | null = null;

  mount(container: HTMLElement, _app: Application): void {
    container.style.padding = "6px 10px";
    container.style.lineHeight = "1.6";
    container.style.whiteSpace = "nowrap";

    // Row 1: FPS + Frame time
    const row1 = document.createElement("div");
    this.#fpsEl = document.createElement("span");
    this.#fpsEl.style.fontWeight = "bold";
    this.#fpsEl.style.marginRight = "8px";
    this.#frameTimeEl = document.createElement("span");
    this.#frameTimeEl.style.color = "rgba(255,255,255,0.6)";
    row1.appendChild(this.#fpsEl);
    row1.appendChild(this.#frameTimeEl);

    // Row 2: Draw calls + Triangles
    const row2 = document.createElement("div");
    row2.style.color = "rgba(255,255,255,0.7)";
    this.#drawCallsEl = document.createElement("span");
    this.#drawCallsEl.style.marginRight = "8px";
    this.#trianglesEl = document.createElement("span");
    row2.appendChild(this.#drawCallsEl);
    row2.appendChild(this.#trianglesEl);

    // Row 3: Error indicator
    const row3 = document.createElement("div");
    this.#errorsEl = document.createElement("span");
    row3.appendChild(this.#errorsEl);

    container.appendChild(row1);
    container.appendChild(row2);
    container.appendChild(row3);

    // Subscribe to profiler updates at 100ms rate (push model)
    this.#unsubscribe = FrameProfiler.subscribe(
      ({ fps, frameTime, last }) => {
        this.#fpsEl.textContent = `${fps || "--"} FPS`;
        this.#frameTimeEl.textContent = `${frameTime > 0 ? frameTime.toFixed(1) : "--"}ms`;

        if (last) {
          this.#drawCallsEl.textContent = `DC:${last.totalDrawCalls}`;
          this.#trianglesEl.textContent = `T:${formatK(last.totalTriangles)}`;
        } else {
          this.#drawCallsEl.textContent = "DC:--";
          this.#trianglesEl.textContent = "T:--";
        }

        const errCount = ErrorTracker.errorCount;
        const dot = "●";
        const color = errCount > 0 ? "#f44336" : "#4caf50";
        this.#errorsEl.innerHTML = `<span style="color:${color}">${dot}</span> ${errCount} error${errCount !== 1 ? "s" : ""}`;
      },
      { rate: 100 }
    );
  }

  unmount(): void {
    if (this.#unsubscribe) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }
  }

  update(): void {
    // No-op: updates are push-based via subscription
  }
}

function formatK(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}
