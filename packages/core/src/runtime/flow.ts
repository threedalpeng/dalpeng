import { hasActiveCleanupScope, registerCleanup } from "./scope";

export interface ReadonlyRef<T> {
  readonly value: T;
  subscribe(cb: (newVal: T, oldVal: T) => void): () => void;
}

export interface Ref<T> extends ReadonlyRef<T> {
  value: T;
}

// ref = 0. computed = max(deps._depth) + 1. Drives bucket ordering in drainPending.
interface DepthCarrier {
  _depth: number;
}

function depthOf(r: ReadonlyRef<unknown>): number {
  return (r as unknown as DepthCarrier)._depth;
}

const trackingStack: Array<Set<ReadonlyRef<unknown>>> = [];

function trackAccess(target: ReadonlyRef<unknown>): void {
  const tracker = trackingStack[trackingStack.length - 1];
  if (tracker) tracker.add(target);
}

interface PendingRef {
  readonly depth: number;
  readonly fire: () => void;
}

// batchDepth > 0 ⇒ writes enqueue (deferred fire); 0 ⇒ fire sync.
let batchDepth = 0;
const pendingRefs = new Map<ReadonlyRef<unknown>, PendingRef>();

// Hard cap on subscriber→write→subscriber chains per drain. Frame hang guard.
const MAX_CASCADE = 8;

// Bucket-by-depth drain: deps fire before derivatives within one cycle. Writes
// performed inside a fire enqueue for the NEXT cycle, so fan-out / fan-in
// graphs settle topologically without a separate mark-sweep pass. batchDepth
// stays > 0 during drain so re-entrant writes go to the queue, not sync.
function drainPending(): void {
  let cycles = 0;
  while (pendingRefs.size > 0) {
    if (cycles++ >= MAX_CASCADE) {
      const remaining = pendingRefs.size;
      pendingRefs.clear();
      console.warn(
        `[flow] cascade depth exceeded ${MAX_CASCADE}; aborted with ${remaining} refs still pending`
      );
      return;
    }

    const buckets: PendingRef[][] = [];
    let maxDepth = 0;
    for (const info of pendingRefs.values()) {
      const d = info.depth;
      if (d > maxDepth) maxDepth = d;
      (buckets[d] ??= []).push(info);
    }
    pendingRefs.clear();

    for (let d = 0; d <= maxDepth; d++) {
      const bucket = buckets[d];
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i++) bucket[i].fire();
    }
  }
}

export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    // batchDepth must stay > 0 during drain so re-entrant writes enqueue.
    try {
      if (batchDepth === 1) drainPending();
    } finally {
      batchDepth--;
    }
  }
}

// Public surface lives in runtime/unsafe.ts.
export function _flushSyncInternal<R>(fn: () => R): R {
  if (pendingRefs.size > 0) drainPending();
  const savedDepth = batchDepth;
  batchDepth = 0;
  try {
    return fn();
  } finally {
    batchDepth = savedDepth;
  }
}

export function ref<T>(initial: T): Ref<T> {
  let _value = initial;
  const listeners = new Set<(newVal: T, oldVal: T) => void>();

  const self = {
    get value() {
      trackAccess(self as unknown as ReadonlyRef<unknown>);
      return _value;
    },
    set value(newVal: T) {
      const oldVal = _value;
      if (newVal === oldVal) return;
      _value = newVal;
      if (batchDepth > 0) {
        const key = self as unknown as ReadonlyRef<unknown>;
        if (!pendingRefs.has(key)) {
          const capturedOld = oldVal;
          pendingRefs.set(key, {
            depth: 0,
            fire: () => {
              const curr = _value;
              if (curr === capturedOld) return;
              // Snapshot: a subscriber may unsubscribe / resubscribe mid-fire.
              const snapshot = Array.from(listeners);
              for (let i = 0; i < snapshot.length; i++) snapshot[i](curr, capturedOld);
            },
          });
        }
        return;
      }
      const snapshot = Array.from(listeners);
      for (let i = 0; i < snapshot.length; i++) snapshot[i](newVal, oldVal);
    },
    subscribe(cb: (newVal: T, oldVal: T) => void) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    _depth: 0,
  };
  return self as unknown as Ref<T>;
}

export function computed<T>(getter: () => T): ReadonlyRef<T> {
  const listeners = new Set<(newVal: T, oldVal: T) => void>();
  let depUnsubs: Array<() => void> = [];
  let currentDeps = new Set<ReadonlyRef<unknown>>();
  let dirty = true;
  let cached: T;
  let initialized = false;
  let selfDepth = 1;

  const evaluate = (): void => {
    depUnsubs.forEach((u) => u());
    depUnsubs = [];

    const newDeps = new Set<ReadonlyRef<unknown>>();
    trackingStack.push(newDeps);
    try {
      cached = getter();
    } finally {
      trackingStack.pop();
    }

    let maxDepDepth = 0;
    newDeps.forEach((dep) => {
      const d = depthOf(dep);
      if (d > maxDepDepth) maxDepDepth = d;
      depUnsubs.push(dep.subscribe(onDepChanged));
    });
    currentDeps = newDeps;
    selfDepth = maxDepDepth + 1;
    (self as unknown as DepthCarrier)._depth = selfDepth;
    dirty = false;
    initialized = true;
  };

  // Re-evaluate without updating cache. Lets reads see live values during a
  // batch where deps changed but the pending fire has not yet run.
  const peek = (): T => {
    const sentinel = new Set<ReadonlyRef<unknown>>();
    trackingStack.push(sentinel);
    try {
      return getter();
    } finally {
      trackingStack.pop();
    }
  };

  const hasPendingDep = (): boolean => {
    if (pendingRefs.size === 0) return false;
    for (const dep of currentDeps) {
      if (pendingRefs.has(dep)) return true;
    }
    return false;
  };

  // Inside batch: enqueue at selfDepth (drain orders dep before derivative).
  // Outside batch: sync cascade — no queue active, topological order not
  // guaranteed but values stay live via .value's peek path.
  const onDepChanged = (): void => {
    if (dirty) return;
    dirty = true;
    if (listeners.size === 0) return;

    if (batchDepth === 0) {
      const oldVal = cached;
      evaluate();
      if (cached !== oldVal) {
        const snapshot = Array.from(listeners);
        for (let i = 0; i < snapshot.length; i++) snapshot[i](cached, oldVal);
      }
      return;
    }

    const key = self as unknown as ReadonlyRef<unknown>;
    if (pendingRefs.has(key)) return;

    const capturedOld = cached;
    pendingRefs.set(key, {
      depth: selfDepth,
      fire: () => {
        // A read via .value during the cascade may have already evaluated.
        if (dirty) evaluate();
        if (cached === capturedOld) return;
        const snapshot = Array.from(listeners);
        for (let i = 0; i < snapshot.length; i++) snapshot[i](cached, capturedOld);
      },
    });
  };

  const dispose = (): void => {
    depUnsubs.forEach((u) => u());
    depUnsubs = [];
    listeners.clear();
  };

  if (hasActiveCleanupScope()) {
    registerCleanup(dispose);
  }

  const self = {
    get value() {
      trackAccess(self as unknown as ReadonlyRef<unknown>);
      if (dirty || !initialized) {
        evaluate();
      } else if (hasPendingDep()) {
        return peek();
      }
      return cached;
    },
    subscribe(cb: (newVal: T, oldVal: T) => void) {
      if (dirty || !initialized) {
        evaluate();
      }
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    _depth: selfDepth,
  };
  return self as unknown as ReadonlyRef<T>;
}

export function isRef<T>(value: unknown): value is ReadonlyRef<T> {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { subscribe?: unknown }).subscribe === "function"
  );
}
