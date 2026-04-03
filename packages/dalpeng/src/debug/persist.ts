export type Persisted = Record<string, unknown>;

export function createPersistStore(key: string) {
  const load = (): Persisted => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Persisted) : {};
    } catch {
      return {};
    }
  };
  const save = (data: Persisted) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  };
  return {
    get<T>(k: string, fallback: T): T {
      const cur = load();
      return (cur[k] as T) ?? fallback;
    },
    set<T>(k: string, v: T) {
      const cur = load();
      cur[k] = v as unknown as any;
      save(cur);
    },
    reset(defaults?: Persisted) {
      save(defaults ?? {});
    },
    raw() {
      return load();
    },
  };
}
