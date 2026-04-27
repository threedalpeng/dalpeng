import { ref, type ReadonlyRef } from "./flow";
import { hasActiveCleanupScope, registerCleanup } from "./scope";

/** Single ref, or a tuple emitting `[r1.value, r2.value, ...]` on any change. */
export type Source<T> = ReadonlyRef<T> | readonly ReadonlyRef<unknown>[];

type Downstream<T> = (value: T) => void;
// Operator factory: wraps a downstream callback, returns an upstream one.
// State (debounce timer, distinct last, ...) lives in the returned closure
// and is instantiated per subscription.
type OpFactory = (downstream: Downstream<unknown>) => Downstream<unknown>;

// Per-subscription cleanup pail for time-deferring ops (timers, rAF handles).
interface OpContext {
  readonly cleanups: Array<() => void>;
}

/** Lazy reactive pipeline. No subscription until a terminal is called. */
export interface Pipeline<T> {
  map<U>(fn: (v: T) => U): Pipeline<U>;
  filter(pred: (v: T) => boolean): Pipeline<T>;
  distinct(eq?: (a: T, b: T) => boolean): Pipeline<T>;
  take(n: number): Pipeline<T>;
  skip(n: number): Pipeline<T>;
  debounce(ms: number): Pipeline<T>;
  throttle(ms: number): Pipeline<T>;
  throttleFrame(): Pipeline<T>;
  afterRender(): Pipeline<T>;
  nextFrame(): Pipeline<T>;
  afterUpdate(): Pipeline<T>;

  effect(cb: (value: T) => void): () => void;
  /** Materialize as a derived Ref. Useful for time-shifted state. */
  toRef(): ReadonlyRef<T>;
}

function readSource<T>(source: Source<T>): T {
  if (Array.isArray(source)) {
    return source.map((r) => r.value) as unknown as T;
  }
  return (source as ReadonlyRef<T>).value;
}

function subscribeSource<T>(source: Source<T>, cb: (v: T) => void): () => void {
  if (Array.isArray(source)) {
    const refs = source;
    const onChange = (): void => cb(refs.map((r) => r.value) as unknown as T);
    const unsubs = refs.map((r) => r.subscribe(onChange));
    return () => {
      for (const u of unsubs) u();
    };
  }
  const r = source as ReadonlyRef<T>;
  return r.subscribe((next) => cb(next));
}

class PipelineImpl<T> implements Pipeline<T> {
  readonly #source: Source<unknown>;
  readonly #ops: OpFactory[];

  constructor(source: Source<unknown>, ops: OpFactory[] = []) {
    this.#source = source;
    this.#ops = ops;
  }

  #extend<U>(op: OpFactory): Pipeline<U> {
    return new PipelineImpl<U>(this.#source, [...this.#ops, op]);
  }

  map<U>(fn: (v: T) => U): Pipeline<U> {
    return this.#extend<U>((down) => (v) => down(fn(v as T)));
  }

  filter(pred: (v: T) => boolean): Pipeline<T> {
    return this.#extend<T>((down) => (v) => {
      if (pred(v as T)) down(v);
    });
  }

  distinct(eq: (a: T, b: T) => boolean = Object.is): Pipeline<T> {
    return this.#extend<T>((down) => {
      let hasLast = false;
      let last: T;
      return (v) => {
        if (hasLast && eq(last, v as T)) return;
        last = v as T;
        hasLast = true;
        down(v);
      };
    });
  }

  take(n: number): Pipeline<T> {
    return this.#extend<T>((down) => {
      let count = 0;
      return (v) => {
        if (count >= n) return;
        count++;
        down(v);
      };
    });
  }

  skip(n: number): Pipeline<T> {
    return this.#extend<T>((down) => {
      let count = 0;
      return (v) => {
        if (count < n) {
          count++;
          return;
        }
        down(v);
      };
    });
  }

  debounce(ms: number): Pipeline<T> {
    return this.#extendWithCleanup<T>((down, ctx) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      ctx.cleanups.push(() => {
        if (timer !== undefined) clearTimeout(timer);
      });
      return (v) => {
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = undefined;
          down(v);
        }, ms);
      };
    });
  }

  throttle(ms: number): Pipeline<T> {
    return this.#extend<T>((down) => {
      let last = -Infinity;
      return (v) => {
        const now = performance.now();
        if (now - last < ms) return;
        last = now;
        down(v);
      };
    });
  }

  throttleFrame(): Pipeline<T> {
    return this.#extendWithCleanup<T>((down, ctx) => {
      let rafHandle: number | undefined;
      let latestValue: unknown;
      let hasPending = false;
      ctx.cleanups.push(() => {
        if (rafHandle !== undefined) cancelAnimationFrame(rafHandle);
      });
      return (v) => {
        latestValue = v;
        if (hasPending) return;
        hasPending = true;
        rafHandle = requestAnimationFrame(() => {
          rafHandle = undefined;
          hasPending = false;
          down(latestValue);
        });
      };
    });
  }

  nextFrame(): Pipeline<T> {
    return this.#extendWithCleanup<T>((down, ctx) => {
      const pending: number[] = [];
      ctx.cleanups.push(() => {
        for (const h of pending) cancelAnimationFrame(h);
        pending.length = 0;
      });
      return (v) => {
        const h = requestAnimationFrame(() => {
          const idx = pending.indexOf(h);
          if (idx >= 0) pending.splice(idx, 1);
          down(v);
        });
        pending.push(h);
      };
    });
  }

  afterRender(): Pipeline<T> {
    // Double rAF: first fires before paint, second after compositing — i.e.
    // "after this frame's render committed".
    return this.#extendWithCleanup<T>((down, ctx) => {
      const pending: number[] = [];
      ctx.cleanups.push(() => {
        for (const h of pending) cancelAnimationFrame(h);
        pending.length = 0;
      });
      return (v) => {
        const h1 = requestAnimationFrame(() => {
          const idx1 = pending.indexOf(h1);
          if (idx1 >= 0) pending.splice(idx1, 1);
          const h2 = requestAnimationFrame(() => {
            const idx2 = pending.indexOf(h2);
            if (idx2 >= 0) pending.splice(idx2, 1);
            down(v);
          });
          pending.push(h2);
        });
        pending.push(h1);
      };
    });
  }

  afterUpdate(): Pipeline<T> {
    // Microtask: drains after the current sync stack, before browser yield.
    // Inside the frame loop this lands before preRender.
    return this.#extend<T>((down) => (v) => {
      queueMicrotask(() => down(v));
    });
  }

  effect(cb: (value: T) => void): () => void {
    const ctx: OpContext = { cleanups: [] };
    const emit = this.#compile(cb as Downstream<unknown>, ctx);
    const srcUnsub = subscribeSource(this.#source, emit);

    const dispose = (): void => {
      srcUnsub();
      for (const c of ctx.cleanups) c();
      ctx.cleanups.length = 0;
    };

    if (hasActiveCleanupScope()) {
      registerCleanup(dispose);
    }
    return dispose;
  }

  toRef(): ReadonlyRef<T> {
    const initial = this.#initialValue() as T;
    const out = ref<T>(initial);
    this.effect((v) => {
      out.value = v;
    });
    return out as ReadonlyRef<T>;
  }

  // Variant that threads compile-time ctx into the op via the
  // `currentCompileCtx` side-channel — keeps OpFactory's signature uniform.
  #extendWithCleanup<U>(
    factory: (down: Downstream<unknown>, ctx: OpContext) => Downstream<unknown>
  ): Pipeline<U> {
    const wrappedFactory: OpFactory = (down) => factory(down, currentCompileCtx as OpContext);
    return this.#extend<U>(wrappedFactory);
  }

  #compile(finalCb: Downstream<unknown>, ctx: OpContext): Downstream<unknown> {
    currentCompileCtx = ctx;
    try {
      let emit: Downstream<unknown> = finalCb;
      for (let i = this.#ops.length - 1; i >= 0; i--) {
        emit = this.#ops[i](emit);
      }
      return emit;
    } finally {
      currentCompileCtx = null;
    }
  }

  // For toRef(): synchronous ops produce an initial value; time-deferring ops
  // (debounce / throttleFrame / nextFrame / afterRender / afterUpdate) leave
  // captured undefined until their first deferred emit lands. Any timer / rAF
  // scheduled during synthesis is cancelled before return.
  #initialValue(): T | undefined {
    const ctx: OpContext = { cleanups: [] };
    let captured: T | undefined;
    const emit = this.#compile((v) => {
      captured = v as T;
    }, ctx);
    try {
      emit(readSource(this.#source));
    } catch {
      // Synthesis failure is non-fatal: ref starts undefined.
    }
    for (const c of ctx.cleanups) c();
    return captured;
  }
}

// Compile-time ctx side-channel — set only during #compile, lets factories
// reach OpContext without widening OpFactory's signature.
let currentCompileCtx: OpContext | null = null;

export function watch<T>(
  source: ReadonlyRef<T>,
  cb: (v: T, old: T) => void,
  opts?: { immediate?: boolean }
): () => void;
export function watch<T>(source: ReadonlyRef<T>): Pipeline<T>;
export function watch<A, B>(source: readonly [ReadonlyRef<A>, ReadonlyRef<B>]): Pipeline<[A, B]>;
export function watch<A, B, C>(
  source: readonly [ReadonlyRef<A>, ReadonlyRef<B>, ReadonlyRef<C>]
): Pipeline<[A, B, C]>;
export function watch<A, B, C, D>(
  source: readonly [ReadonlyRef<A>, ReadonlyRef<B>, ReadonlyRef<C>, ReadonlyRef<D>]
): Pipeline<[A, B, C, D]>;
export function watch<T>(source: readonly ReadonlyRef<unknown>[]): Pipeline<T[]>;
export function watch(
  source: ReadonlyRef<unknown> | readonly ReadonlyRef<unknown>[],
  cb?: (v: unknown, old: unknown) => void,
  opts?: { immediate?: boolean }
): Pipeline<unknown> | (() => void) {
  if (cb !== undefined) {
    if (Array.isArray(source)) {
      throw new TypeError(
        "watch(sources, cb) short form requires a single ReadonlyRef. Use watch([a, b]).effect(cb) for multi-source."
      );
    }
    const r = source as ReadonlyRef<unknown>;
    const unsubscribe = r.subscribe(cb);
    if (hasActiveCleanupScope()) {
      registerCleanup(unsubscribe);
    }
    if (opts?.immediate) {
      cb(r.value, r.value);
    }
    return unsubscribe;
  }

  return new PipelineImpl<unknown>(source);
}
