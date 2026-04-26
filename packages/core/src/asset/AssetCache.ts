/**
 * Generic asset cache with race-safe load coalescing and an init gate.
 *
 * Concurrent `load(key, loader)` calls for the same key share a single in-
 * flight promise. The init gate lets a manager defer loads until its backend
 * dependency (renderer, GL context, etc.) is ready. The optional disposer
 * runs on unload / dispose so callers don't have to write the same teardown
 * loop in every manager.
 */
export interface AssetCacheConfig<T> {
  /** Disposer invoked when an entry is unloaded or the cache is disposed. */
  dispose?(value: T): void;
  /**
   * If true, the cache is ready immediately and `load()` does not wait on
   * `markReady()`. Use for caches that have no async backend init step.
   */
  readyOnConstruct?: boolean;
}

export default class AssetCache<T> {
  readonly #cache = new Map<string, T>();
  readonly #loading = new Map<string, Promise<T>>();
  readonly #config: AssetCacheConfig<T>;

  #initPromise: Promise<void>;
  #resolveInit!: () => void;
  #ready = false;

  constructor(config: AssetCacheConfig<T> = {}) {
    this.#config = config;
    this.#initPromise = new Promise<void>((resolve) => {
      this.#resolveInit = resolve;
    });
    if (config.readyOnConstruct) this.markReady();
  }

  /** Open the init gate so subsequent `load()` calls proceed. Idempotent. */
  markReady(): void {
    if (this.#ready) return;
    this.#ready = true;
    this.#resolveInit();
  }

  /** Race-safe load. Coalesces concurrent calls for the same `key`. */
  async load(key: string, loader: () => Promise<T>): Promise<T> {
    await this.#initPromise;
    const cached = this.#cache.get(key);
    if (cached !== undefined) return cached;
    const inFlight = this.#loading.get(key);
    if (inFlight !== undefined) return inFlight;

    const promise = loader();
    this.#loading.set(key, promise);
    try {
      const value = await promise;
      this.#cache.set(key, value);
      return value;
    } finally {
      this.#loading.delete(key);
    }
  }

  get(key: string): T | undefined {
    return this.#cache.get(key);
  }

  has(key: string): boolean {
    return this.#cache.has(key);
  }

  /** Devtools introspection. Returns live entries — do not mutate. */
  entries(): Iterable<[string, T]> {
    return this.#cache.entries();
  }

  /** Release one entry; runs disposer if configured. Returns true on hit. */
  unload(key: string): boolean {
    const value = this.#cache.get(key);
    if (value === undefined) return false;
    this.#config.dispose?.(value);
    this.#cache.delete(key);
    return true;
  }

  /** Release every cached entry. Loading promises are left to settle naturally. */
  unloadAll(): void {
    if (this.#config.dispose) {
      for (const value of this.#cache.values()) this.#config.dispose(value);
    }
    this.#cache.clear();
  }

  /** Full teardown — drops cache + in-flight map + runs disposer. */
  dispose(): void {
    this.unloadAll();
    this.#loading.clear();
  }
}
