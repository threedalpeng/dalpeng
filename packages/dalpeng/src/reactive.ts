import { hasActiveCleanupScope, registerCleanup } from "./context";

export interface Ref<T> {
  value: T;
  subscribe(cb: (newVal: T, oldVal: T) => void): () => void;
}

export function ref<T>(initial: T): Ref<T> {
  let _value = initial;
  const listeners = new Set<(newVal: T, oldVal: T) => void>();

  return {
    get value() {
      return _value;
    },
    set value(newVal: T) {
      const oldVal = _value;
      // Shallow equality check - skip notification if same
      if (newVal === oldVal) {
        return;
      }
      _value = newVal;
      // Notify all listeners
      listeners.forEach((cb) => cb(newVal, oldVal));
    },
    subscribe(cb: (newVal: T, oldVal: T) => void) {
      listeners.add(cb);
      // Return unsubscribe function
      return () => {
        listeners.delete(cb);
      };
    },
  };
}

export function watch<T>(
  source: Ref<T>,
  cb: (v: T, old: T) => void,
  opts?: { immediate?: boolean }
): () => void {
  // Subscribe to source
  const unsubscribe = source.subscribe(cb);

  // Auto-register cleanup if in active scope
  if (hasActiveCleanupScope()) {
    registerCleanup(unsubscribe);
  }

  // Call immediately if requested
  if (opts?.immediate) {
    cb(source.value, source.value);
  }

  return unsubscribe;
}

export function isRef<T>(value: any): value is Ref<T> {
  // Duck-typing check: has subscribe function
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.subscribe === "function"
  );
}
