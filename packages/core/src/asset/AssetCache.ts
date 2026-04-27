export interface AssetCacheConfig<T> {
  dispose?(value: T): void;
  /** When true, skip the init gate. Caches with no async backend dependency. */
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

  /** Idempotent. */
  markReady(): void {
    if (this.#ready) return;
    this.#ready = true;
    this.#resolveInit();
  }

  /** Concurrent calls for the same `key` share one in-flight promise. */
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

  /** Live entries; do not mutate. */
  entries(): Iterable<[string, T]> {
    return this.#cache.entries();
  }

  unload(key: string): boolean {
    const value = this.#cache.get(key);
    if (value === undefined) return false;
    this.#config.dispose?.(value);
    this.#cache.delete(key);
    return true;
  }

  unloadAll(): void {
    if (this.#config.dispose) {
      for (const value of this.#cache.values()) this.#config.dispose(value);
    }
    this.#cache.clear();
  }

  dispose(): void {
    this.unloadAll();
    this.#loading.clear();
  }
}
