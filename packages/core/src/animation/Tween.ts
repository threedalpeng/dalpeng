import type { EasingFn } from "./easings";
import { linear } from "./easings";

export interface TweenOptions {
  from?: Record<string, number>;
  to: Record<string, number>;
  duration: number; // ms
  easing?: EasingFn;
  delay?: number; // ms, default 0
  onUpdate?: () => void;
  onComplete?: () => void;
}

export default class Tween {
  target: Record<string, number>;
  from: Record<string, number>;
  to: Record<string, number>;
  duration: number;
  easing: EasingFn;
  delay: number;
  onUpdate: (() => void) | null;
  onComplete: (() => void) | null;

  #elapsed = 0; // ms elapsed (including delay)
  #isActive = true;
  #isComplete = false;
  #next: Tween | null = null; // for chaining

  constructor(target: Record<string, number>, opts: TweenOptions) {
    this.target = target;
    this.to = opts.to;
    this.duration = opts.duration;
    this.easing = opts.easing ?? linear;
    this.delay = opts.delay ?? 0;
    this.onUpdate = opts.onUpdate ?? null;
    this.onComplete = opts.onComplete ?? null;

    // If from is not provided, snapshot current values from target
    if (opts.from) {
      this.from = { ...opts.from };
    } else {
      this.from = {};
      for (const key of Object.keys(this.to)) {
        this.from[key] = this.target[key] ?? 0;
      }
    }
  }

  get isActive(): boolean {
    return this.#isActive;
  }

  get isComplete(): boolean {
    return this.#isComplete;
  }

  /** Advance by dt milliseconds. Returns true if still active. */
  tick(dt: number): boolean {
    if (!this.#isActive) return false;

    // Ignore non-positive dt
    if (dt <= 0) return true;

    this.#elapsed += dt;
    const effectiveTime = this.#elapsed - this.delay;

    if (effectiveTime < 0) return true; // still in delay

    // Handle zero duration: jump immediately to completion
    const progress = this.duration <= 0 ? 1 : Math.min(effectiveTime / this.duration, 1);
    const easedProgress = this.easing(progress);

    // Interpolate all properties
    for (const key of Object.keys(this.to)) {
      const start = this.from[key] ?? 0;
      const end = this.to[key];
      this.target[key] = start + (end - start) * easedProgress;
    }

    this.onUpdate?.();

    if (progress >= 1) {
      this.#isComplete = true;
      this.#isActive = false;
      this.onComplete?.();
      return false;
    }
    return true;
  }

  /** Stop this tween immediately */
  stop(): void {
    this.#isActive = false;
  }

  /** Chain: create a follow-up tween on the same target */
  then(opts: TweenOptions): Tween {
    const next = new Tween(this.target, opts);
    this.#next = next;
    return next;
  }

  /** Internal: get the chained tween (if any) */
  _getNext(): Tween | null {
    return this.#next;
  }
}
