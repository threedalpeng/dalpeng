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
      // Snapshot before notifying: a subscriber may unsubscribe/re-subscribe
      // (e.g. computed reattaching its tracker), which would cause infinite
      // recursion if we iterated the live Set.
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
  let dirty = true;
  let cached: T;
  let initialized = false;

  const evaluate = (): void => {
    // Drop old dependency subscriptions before re-tracking.
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
    dirty = false;
    initialized = true;
  };

  const onDepChanged = (): void => {
    if (dirty) return;
    dirty = true;
    // Eagerly recompute so subscribers see the new value at notification time.
    // Snapshot before notifying — same reason as ref's setter.
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
