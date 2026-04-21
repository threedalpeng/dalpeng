import {
  computed,
  Logger,
  ref,
  watch,
  type Application,
  type FrameStatsSummary,
  type GameEntity,
  type LogEntry,
  type ReadonlyRef,
  type Scene,
} from "@dalpeng/core";
import { componentDisplayName } from "./editSchema";
import type {
  AnyPatch,
  AtlasInfo,
  DevToolsHost,
  FeaturePatch,
  HostEvents,
  Patch,
  PatchId,
  TextureInfo,
} from "./host";

const EMPTY_ENTITIES: readonly GameEntity[] = Object.freeze([]);
const EMPTY_PATCHES: readonly AnyPatch[] = Object.freeze([]);
const DEFAULT_FRAME_STATS: FrameStatsSummary = {
  fps: 0,
  frameTime: 0,
  drawCalls: 0,
  triangles: 0,
};

const PINNED_KEY = "dalpeng.devtools.pinnedPatches";

interface PinnedRecord {
  kind: "field" | "feature";
  entityName?: string;
  componentType?: string;
  field?: string;
  featureKey?: string;
  value: unknown;
}

function loadPinned(): PinnedRecord[] {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    return raw ? (JSON.parse(raw) as PinnedRecord[]) : [];
  } catch {
    return [];
  }
}

function savePinned(records: PinnedRecord[]): void {
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify(records));
  } catch {
    /* ignore quota errors */
  }
}

// Serializable deep clone for baseline capture and localStorage.
function cloneValue(v: unknown): unknown {
  if (v == null || typeof v !== "object") return v;
  if (ArrayBuffer.isView(v)) {
    const arr = v as unknown as { slice(): unknown };
    return arr.slice();
  }
  if (Array.isArray(v)) return v.slice();
  try {
    return JSON.parse(JSON.stringify(v));
  } catch {
    return v;
  }
}

function isArrayLikeMutable(v: unknown): v is { length: number; [i: number]: number } {
  return (
    v != null &&
    typeof v === "object" &&
    typeof (v as { length?: unknown }).length === "number" &&
    !(v instanceof Map) &&
    !(v instanceof Set)
  );
}

let nextPatchId = 0;
function makePatchId(): PatchId {
  return `patch-${++nextPatchId}`;
}

function fieldKey(entityId: number, componentType: string, field: string): string {
  return `${entityId}/${componentType}/${field}`;
}

export function createDevToolsHost(initial: Application | null = null): {
  host: DevToolsHost;
  attachApp(app: Application): void;
  detach(): void;
} {
  const appRef = ref<Application | null>(initial);

  const frameStats = computed<FrameStatsSummary>(() => {
    const a = appRef.value;
    return a ? a.frameStats.value : DEFAULT_FRAME_STATS;
  });

  const activeScene = computed<Scene | null>(() => {
    const a = appRef.value;
    return a ? a.activeScene.value : null;
  });

  const entities = computed<readonly GameEntity[]>(() => {
    const scene = activeScene.value;
    return scene ? scene.entitiesRef.value : EMPTY_ENTITIES;
  });

  const logs: ReadonlyRef<readonly LogEntry[]> = Logger.entries;

  // ── Patch storage ──────────────────────────────────────────────────
  const fieldPatches = new Map<string, Patch>();
  const featurePatches = new Map<string, FeaturePatch>();
  const patchesRef = ref<readonly AnyPatch[]>(EMPTY_PATCHES);

  function publishPatches(): void {
    const out: AnyPatch[] = [];
    for (const p of fieldPatches.values()) out.push(p);
    for (const p of featurePatches.values()) out.push(p);
    patchesRef.value = out;
  }

  // ── Event bus ──────────────────────────────────────────────────────
  type Listener<K extends keyof HostEvents> = (data: HostEvents[K]) => void;
  const listeners = new Map<keyof HostEvents, Set<Listener<keyof HostEvents>>>();

  function on<K extends keyof HostEvents>(event: K, cb: Listener<K>): () => void {
    let set = listeners.get(event);
    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }
    set.add(cb as Listener<keyof HostEvents>);
    return () => void set!.delete(cb as Listener<keyof HostEvents>);
  }

  function emit<K extends keyof HostEvents>(event: K, data: HostEvents[K]): void {
    const set = listeners.get(event);
    if (!set) return;
    for (const cb of Array.from(set)) {
      try {
        (cb as Listener<K>)(data);
      } catch (err) {
        console.error(`[devtools] listener threw for "${String(event)}":`, err);
      }
    }
  }

  const unwatchScene = watch(activeScene, (scene) => {
    emit("sceneChanged", { scene });
  });

  const seenLogs = new WeakSet<LogEntry>();
  const unwatchLogs = watch(logs, (entries) => {
    for (const entry of entries) {
      if (entry.level === "error" && !seenLogs.has(entry)) {
        seenLogs.add(entry);
        emit("errorLogged", { entry });
      }
    }
  });

  // ── Value writer: mutate array-likes in place ─────────────────────
  //
  // Array-like fields (Vec3, Quaternion, Float32Array) are written in place
  // to preserve reference identity — anything else holding the same ref sees
  // the update automatically. We still reassign at the end so the property
  // setter runs, because many components (e.g., `Transform.position`)
  // perform side effects like `markDirty()` / dirty-queue registration that
  // in-place mutation bypasses, which would leave renders stale.
  function writeValue(target: Record<string, unknown>, field: string, value: unknown): void {
    const current = target[field];
    if (isArrayLikeMutable(current) && isArrayLikeMutable(value)) {
      const c = current as unknown as number[];
      const v = value as unknown as number[];
      const n = Math.min(c.length, v.length);
      for (let i = 0; i < n; i++) c[i] = v[i];
      target[field] = current;
      return;
    }
    target[field] = value;
  }

  // ── Host implementation ───────────────────────────────────────────
  const host: DevToolsHost = {
    app: appRef,
    frameStats,
    activeScene,
    get features() {
      return appRef.value?.features ?? ({} as Application["features"]);
    },
    entities,
    logs,
    patches: patchesRef,

    findByTag(tag: string): GameEntity[] {
      return activeScene.value?.findByTag(tag) ?? [];
    },

    textures(): TextureInfo[] {
      const a = appRef.value;
      if (!a) return [];
      const out: TextureInfo[] = [];
      for (const [url, tex] of a.textures.entries()) {
        out.push({ url, width: tex.width, height: tex.height });
      }
      return out;
    },

    atlases(): AtlasInfo[] {
      const a = appRef.value;
      if (!a) return [];
      const out: AtlasInfo[] = [];
      for (const [key, atlas] of a.atlases.entries()) {
        out.push({
          key,
          frameCount: atlas.frameCount,
          textureWidth: atlas.texture.width,
          textureHeight: atlas.texture.height,
        });
      }
      return out;
    },

    isPatched(entity, componentType, field) {
      return fieldPatches.has(fieldKey(entity.id, componentType, field));
    },

    isFeaturePatched(key) {
      return featurePatches.has(key);
    },

    setField(entity, component, field, value): PatchId {
      const target = component as unknown as Record<string, unknown>;
      const componentType = componentDisplayName(component);
      const key = fieldKey(entity.id, componentType, field);
      const existing = fieldPatches.get(key);

      if (existing) {
        writeValue(target, field, value);
        return existing.id;
      }

      const baseline = cloneValue(target[field]);
      writeValue(target, field, value);

      const id = makePatchId();
      const patch: Patch = {
        id,
        entity,
        entityName: entity.name,
        component,
        componentType,
        field,
        baselineValue: baseline,
        kind: "ephemeral",
        timestamp: Date.now(),
      };
      fieldPatches.set(key, patch);
      publishPatches();
      emit("patchApplied", { patch });
      return id;
    },

    setFeature(key, value): PatchId {
      const features = appRef.value?.features as unknown as Record<string, unknown> | undefined;
      if (!features) throw new Error("host.setFeature: app not attached");
      const existing = featurePatches.get(key);

      if (existing) {
        features[key] = value;
        return existing.id;
      }

      const baseline = cloneValue(features[key]);
      features[key] = value;

      const id = makePatchId();
      const patch: FeaturePatch = {
        id,
        key,
        baselineValue: baseline,
        kind: "ephemeral",
        timestamp: Date.now(),
      };
      featurePatches.set(key, patch);
      publishPatches();
      emit("patchApplied", { patch });
      return id;
    },

    pinPatch(id): void {
      for (const [k, p] of fieldPatches) {
        if (p.id === id) {
          fieldPatches.set(k, { ...p, kind: "pinned" });
          publishPatches();
          persistPinned();
          return;
        }
      }
      for (const [k, p] of featurePatches) {
        if (p.id === id) {
          featurePatches.set(k, { ...p, kind: "pinned" });
          publishPatches();
          persistPinned();
          return;
        }
      }
    },

    clearPatch(id): void {
      for (const [k, p] of fieldPatches) {
        if (p.id === id) {
          const target = p.component as unknown as Record<string, unknown>;
          writeValue(target, p.field, p.baselineValue);
          fieldPatches.delete(k);
          publishPatches();
          persistPinned();
          emit("patchCleared", { patchId: id });
          return;
        }
      }
      for (const [k, p] of featurePatches) {
        if (p.id === id) {
          const features = appRef.value?.features as unknown as Record<string, unknown> | undefined;
          if (features) features[p.key] = p.baselineValue;
          featurePatches.delete(k);
          publishPatches();
          persistPinned();
          emit("patchCleared", { patchId: id });
          return;
        }
      }
    },

    clearAllPatches(): void {
      const ids: PatchId[] = [];
      for (const p of fieldPatches.values()) ids.push(p.id);
      for (const p of featurePatches.values()) ids.push(p.id);
      for (const id of ids) host.clearPatch(id);
    },

    exportPatches(): string {
      const fields = Array.from(fieldPatches.values());
      const feats = Array.from(featurePatches.values());
      if (fields.length + feats.length === 0) return "// no patches";

      const lines: string[] = ["// Dalpeng DevTools patches — paste into code"];
      for (const p of fields) {
        const live = (p.component as unknown as Record<string, unknown>)[p.field];
        lines.push(`// ${p.entityName} / ${p.componentType}.${p.field}`);
        lines.push(`//   baseline: ${formatValue(p.baselineValue)}`);
        lines.push(`//   patched:  ${formatValue(live)}${p.kind === "pinned" ? "  [pinned]" : ""}`);
      }
      for (const p of feats) {
        const live = (appRef.value?.features as unknown as Record<string, unknown> | undefined)?.[
          p.key
        ];
        lines.push(`// features.${p.key}`);
        lines.push(`//   baseline: ${formatValue(p.baselineValue)}`);
        lines.push(`//   patched:  ${formatValue(live)}${p.kind === "pinned" ? "  [pinned]" : ""}`);
      }
      return lines.join("\n");
    },

    on,
    emit,
  };

  function formatValue(v: unknown): string {
    if (v == null) return String(v);
    if (isArrayLikeMutable(v)) {
      const arr = Array.from(v as unknown as ArrayLike<number>);
      return `[${arr.map((n) => (typeof n === "number" ? n.toFixed(3).replace(/\.?0+$/, "") : String(n))).join(", ")}]`;
    }
    if (typeof v === "object") {
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    }
    return String(v);
  }

  function persistPinned(): void {
    const records: PinnedRecord[] = [];
    for (const p of fieldPatches.values()) {
      if (p.kind !== "pinned") continue;
      if (!p.entityName) continue;
      const live = (p.component as unknown as Record<string, unknown>)[p.field];
      records.push({
        kind: "field",
        entityName: p.entityName,
        componentType: p.componentType,
        field: p.field,
        value: cloneValue(live),
      });
    }
    for (const p of featurePatches.values()) {
      if (p.kind !== "pinned") continue;
      const live = (appRef.value?.features as unknown as Record<string, unknown> | undefined)?.[
        p.key
      ];
      records.push({ kind: "feature", featureKey: p.key, value: cloneValue(live) });
    }
    savePinned(records);
  }

  function reapplyPinned(): void {
    const records = loadPinned();
    const app = appRef.value;
    if (!app) return;
    const scene = app.activeScene.value;

    for (const rec of records) {
      if (rec.kind === "feature") {
        const features = app.features as unknown as Record<string, unknown>;
        const existing = featurePatches.get(rec.featureKey!);
        if (existing) continue;
        const baseline = cloneValue(features[rec.featureKey!]);
        features[rec.featureKey!] = rec.value;
        const patch: FeaturePatch = {
          id: makePatchId(),
          key: rec.featureKey!,
          baselineValue: baseline,
          kind: "pinned",
          timestamp: Date.now(),
        };
        featurePatches.set(rec.featureKey!, patch);
      } else if (rec.kind === "field" && scene) {
        const matches = scene.entitiesRef.value.filter((e) => e.name === rec.entityName);
        if (matches.length === 0) continue;
        if (matches.length > 1) {
          console.warn(
            `[devtools] pinned patch: multiple entities named "${rec.entityName}" — applying to first`
          );
        }
        const ent = matches[0];
        const comp = ent
          .getAllComponents()
          .find((c) => componentDisplayName(c) === rec.componentType);
        if (!comp) continue;
        const target = comp as unknown as Record<string, unknown>;
        const key = fieldKey(ent.id, rec.componentType!, rec.field!);
        if (fieldPatches.has(key)) continue;
        const baseline = cloneValue(target[rec.field!]);
        writeValue(target, rec.field!, rec.value);
        const patch: Patch = {
          id: makePatchId(),
          entity: ent,
          entityName: ent.name,
          component: comp,
          componentType: rec.componentType!,
          field: rec.field!,
          baselineValue: baseline,
          kind: "pinned",
          timestamp: Date.now(),
        };
        fieldPatches.set(key, patch);
      }
    }
    publishPatches();
  }

  const unwatchReapply = watch(activeScene, (scene) => {
    if (scene) reapplyPinned();
  });

  return {
    host,
    attachApp(app: Application) {
      appRef.value = app;
      reapplyPinned();
    },
    detach() {
      unwatchScene();
      unwatchLogs();
      unwatchReapply();
      appRef.value = null;
    },
  };
}
