export interface PassTiming {
  name: string;
  duration: number; // ms
  drawCalls: number;
  triangles: number;
}

export interface FrameStats {
  frameNumber: number;
  timestamp: number;
  totalTime: number; // ms
  passes: PassTiming[];
  totalDrawCalls: number;
  totalTriangles: number;
}

export default class FrameProfiler {
  static enabled = false;
  static #history: FrameStats[] = [];
  static #maxHistory = 120;
  static #frameNumber = 0;
  static #currentFrame: FrameStats | null = null;
  static #currentPass: {
    name: string;
    start: number;
    drawCalls: number;
    triangles: number;
  } | null = null;
  static #frameStart = 0;

  static beginFrame(): void {
    if (!this.enabled) return;
    this.#frameStart = performance.now();
    this.#currentFrame = {
      frameNumber: this.#frameNumber++,
      timestamp: this.#frameStart,
      totalTime: 0,
      passes: [],
      totalDrawCalls: 0,
      totalTriangles: 0,
    };
  }

  static endFrame(): void {
    if (!this.enabled || !this.#currentFrame) return;
    this.#currentFrame.totalTime = performance.now() - this.#frameStart;
    for (const p of this.#currentFrame.passes) {
      this.#currentFrame.totalDrawCalls += p.drawCalls;
      this.#currentFrame.totalTriangles += p.triangles;
    }
    this.#history.push(this.#currentFrame);
    if (this.#history.length > this.#maxHistory) {
      this.#history.shift();
    }
    const now = this.#currentFrame.timestamp;
    for (const sub of this.#subscribers) {
      if (now - sub.lastPush >= sub.rate) {
        sub.lastPush = now;
        sub.cb({
          fps: this.getAverageFPS(),
          frameTime: this.getAverageFrameTime(),
          last: this.#currentFrame,
        });
      }
    }
    this.#currentFrame = null;
  }

  static beginPass(name: string): void {
    if (!this.enabled || !this.#currentFrame) return;
    this.#currentPass = {
      name,
      start: performance.now(),
      drawCalls: 0,
      triangles: 0,
    };
  }

  static endPass(): void {
    if (!this.enabled || !this.#currentFrame || !this.#currentPass) return;
    this.#currentFrame.passes.push({
      name: this.#currentPass.name,
      duration: performance.now() - this.#currentPass.start,
      drawCalls: this.#currentPass.drawCalls,
      triangles: this.#currentPass.triangles,
    });
    this.#currentPass = null;
  }

  static recordDraw(triangles: number): void {
    if (!this.enabled || !this.#currentPass) return;
    this.#currentPass.drawCalls++;
    this.#currentPass.triangles += triangles;
  }

  static getLastFrame(): FrameStats | null {
    return this.#history.length > 0
      ? this.#history[this.#history.length - 1]
      : null;
  }

  static getHistory(): readonly FrameStats[] {
    return this.#history;
  }

  static getAverageFPS(): number {
    if (this.#history.length < 2) return 0;
    const first = this.#history[0];
    const last = this.#history[this.#history.length - 1];
    const elapsed = last.timestamp - first.timestamp;
    return elapsed > 0 ? Math.round((this.#history.length * 1000) / elapsed) : 0;
  }

  static getAverageFrameTime(): number {
    if (this.#history.length === 0) return 0;
    let sum = 0;
    for (const f of this.#history) sum += f.totalTime;
    return sum / this.#history.length;
  }

  static getMinFPS(): number {
    if (this.#history.length === 0) return 0;
    let maxTime = 0;
    for (const f of this.#history) if (f.totalTime > maxTime) maxTime = f.totalTime;
    return maxTime > 0 ? Math.round(1000 / maxTime) : 0;
  }

  static #subscribers: Array<{
    cb: (stats: { fps: number; frameTime: number; last: FrameStats | null }) => void;
    rate: number;
    lastPush: number;
  }> = [];

  /**
   * Subscribe to profiler updates. Callback fires at the specified rate.
   * @param cb - receives { fps, frameTime, last } on each tick
   * @param opts - { rate: interval in ms (default 100) }
   * @returns unsubscribe function
   */
  static subscribe(
    cb: (stats: { fps: number; frameTime: number; last: FrameStats | null }) => void,
    opts?: { rate?: number }
  ): () => void {
    const entry = { cb, rate: opts?.rate ?? 100, lastPush: 0 };
    this.#subscribers.push(entry);
    return () => {
      const idx = this.#subscribers.indexOf(entry);
      if (idx >= 0) this.#subscribers.splice(idx, 1);
    };
  }
}
