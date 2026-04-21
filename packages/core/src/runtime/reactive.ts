import { hasActiveCleanupScope, registerCleanup } from "./scope";

export interface ReadonlyRef<T> {
  readonly value: T;
  subscribe(cb: (newVal: T, oldVal: T) => void): () => void;
}

export interface Ref<T> extends ReadonlyRef<T> {
  value: T;
}

const trackingStack: Array<Set<ReadonlyRef<unknown>>> = [];

function trackAccess(target: ReadonlyRef<unknown>): void {
  const tracker = trackingStack[trackingStack.length - 1];
  if (tracker) tracker.add(target);
}

// During batch(fn): ref writes update _value immediately but defer subscriber
// fires. N writes to the same ref collapse to 1 notification; a write-then-
// revert fires nothing. Cross-ref dedupe requires computed().
interface PendingRef {
  readonly oldVal: unknown;
  readonly fire: () => void;
}

let batchDepth = 0;
const pendingRefs = new Map<ReadonlyRef<unknown>, PendingRef>();

export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      // Drain even on throw — a throw before drain would update _value without notifying subscribers.
      const entries = Array.from(pendingRefs.values());
      pendingRefs.clear();
      for (const info of entries) info.fire();
    }
  }
}

export function ref<T>(initial: T): Ref<T> {
  let _value = initial;
  const listeners = new Set<(newVal: T, oldVal: T) => void>();

  const self: Ref<T> = {
    get value() {
      trackAccess(self as ReadonlyRef<unknown>);
      return _value;
    },
    set value(newVal: T) {
      const oldVal = _value;
      if (newVal === oldVal) {
        return;
      }
      _value = newVal;
      if (batchDepth > 0) {
        const key = self as unknown as ReadonlyRef<unknown>;
        if (!pendingRefs.has(key)) {
          const capturedOld = oldVal;
          pendingRefs.set(key, {
            oldVal: capturedOld,
            fire: () => {
              const curr = _value;
              if (curr === capturedOld) return;
              const snapshot = Array.from(listeners);
              for (let i = 0; i < snapshot.length; i++) snapshot[i](curr, capturedOld);
            },
          });
        }
        return;
      }
      // Snapshot: a subscriber may mutate listeners (computed reattach → infinite loop on live Set).
      const snapshot = Array.from(listeners);
      for (let i = 0; i < snapshot.length; i++) {
        snapshot[i](newVal, oldVal);
      }
    },
    subscribe(cb: (newVal: T, oldVal: T) => void) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
  return self;
}

export function computed<T>(getter: () => T): ReadonlyRef<T> {
  const listeners = new Set<(newVal: T, oldVal: T) => void>();
  let depUnsubs: Array<() => void> = [];
  let currentDeps = new Set<ReadonlyRef<unknown>>();
  let dirty = true;
  let cached: T;
  let initialized = false;

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

    newDeps.forEach((dep) => {
      depUnsubs.push(dep.subscribe(onDepChanged));
    });
    currentDeps = newDeps;
    dirty = false;
    initialized = true;
  };

  // Peek without updating cache — used during batch when cached is stale but onDepChanged hasn't fired.
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

  const onDepChanged = (): void => {
    if (dirty) return;
    dirty = true;
    if (listeners.size > 0) {
      const oldVal = cached;
      evaluate();
      if (cached !== oldVal) {
        const snapshot = Array.from(listeners);
        for (let i = 0; i < snapshot.length; i++) {
          snapshot[i](cached, oldVal);
        }
      }
    }
  };

  const dispose = (): void => {
    depUnsubs.forEach((u) => u());
    depUnsubs = [];
    listeners.clear();
  };

  if (hasActiveCleanupScope()) {
    registerCleanup(dispose);
  }

  const self: ReadonlyRef<T> = {
    get value() {
      trackAccess(self as ReadonlyRef<unknown>);
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
  };
  return self;
}

export function watch<T>(
  source: ReadonlyRef<T>,
  cb: (v: T, old: T) => void,
  opts?: { immediate?: boolean }
): () => void {
  const unsubscribe = source.subscribe(cb);
  if (hasActiveCleanupScope()) {
    registerCleanup(unsubscribe);
  }
  if (opts?.immediate) {
    cb(source.value, source.value);
  }
  return unsubscribe;
}

export function isRef<T>(value: unknown): value is ReadonlyRef<T> {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { subscribe?: unknown }).subscribe === "function"
  );
}
