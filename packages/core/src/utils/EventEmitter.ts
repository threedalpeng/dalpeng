export type EventMap = Record<string, any[]>;

export default class EventEmitter<E extends EventMap = EventMap> {
  #listeners = new Map<keyof E, Set<(...args: any[]) => void>>();

  on<K extends keyof E>(event: K, cb: (...args: E[K]) => void): () => void {
    let set = this.#listeners.get(event);
    if (!set) { set = new Set(); this.#listeners.set(event, set); }
    set.add(cb);
    return () => set!.delete(cb);
  }

  off<K extends keyof E>(event: K, cb: (...args: E[K]) => void): void {
    this.#listeners.get(event)?.delete(cb);
  }

  emit<K extends keyof E>(event: K, ...args: E[K]): void {
    const set = this.#listeners.get(event);
    if (!set) return;
    for (const cb of set) cb(...args);
  }

  once<K extends keyof E>(event: K, cb: (...args: E[K]) => void): () => void {
    const wrapper = (...args: E[K]) => { unsub(); (cb as any)(...args); };
    const unsub = this.on(event, wrapper as any);
    return unsub;
  }

  clear(event?: keyof E): void {
    if (event) { this.#listeners.delete(event); }
    else { this.#listeners.clear(); }
  }
}
