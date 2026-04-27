import { hasActiveCleanupScope, registerCleanup } from "./scope";

export type EventMap = Record<string, any[]>;

export interface Dispatcher<E extends EventMap = EventMap> {
  on<K extends keyof E>(event: K, cb: (...args: E[K]) => void): () => void;
  once<K extends keyof E>(event: K, cb: (...args: E[K]) => void): () => void;
  off<K extends keyof E>(event: K, cb: (...args: E[K]) => void): void;
  emit<K extends keyof E>(event: K, ...args: E[K]): void;
  clear(event?: keyof E): void;
}

/** Typed event dispatcher. `.on` / `.once` auto-register cleanup with the active scope. */
export function createDispatcher<E extends EventMap = EventMap>(): Dispatcher<E> {
  const listeners = new Map<keyof E, Set<(...args: any[]) => void>>();

  const dispatcher: Dispatcher<E> = {
    on(event, cb) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(cb as (...args: any[]) => void);
      const unsub = () => {
        set!.delete(cb as (...args: any[]) => void);
      };
      if (hasActiveCleanupScope()) {
        registerCleanup(unsub);
      }
      return unsub;
    },
    once(event, cb) {
      const wrapper = (...args: any[]) => {
        unsub();
        (cb as (...a: any[]) => void)(...args);
      };
      const unsub = dispatcher.on(event, wrapper as any);
      return unsub;
    },
    off(event, cb) {
      listeners.get(event)?.delete(cb as (...args: any[]) => void);
    },
    emit(event, ...args) {
      const set = listeners.get(event);
      if (!set) return;
      // A listener may unsubscribe itself; snapshot to avoid live-set mutation.
      const snapshot = Array.from(set);
      for (let i = 0; i < snapshot.length; i++) snapshot[i](...(args as any[]));
    },
    clear(event) {
      if (event !== undefined) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    },
  };

  return dispatcher;
}
