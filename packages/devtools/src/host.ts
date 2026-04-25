import type {
  Application,
  Component,
  FeatureState,
  FrameStatsSummary,
  GameEntity,
  LogEntry,
  ReadonlyRef,
  Scene,
} from "@dalpeng/core";

export type PatchId = string;

export interface Patch {
  readonly id: PatchId;
  readonly entity: GameEntity;
  readonly entityName: string;
  readonly component: Component;
  readonly componentType: string;
  readonly field: string;
  readonly baselineValue: unknown;
  readonly kind: "ephemeral" | "pinned";
  readonly timestamp: number;
}

export interface FeaturePatch {
  readonly id: PatchId;
  readonly key: string;
  readonly baselineValue: unknown;
  readonly kind: "ephemeral" | "pinned";
  readonly timestamp: number;
}

export type AnyPatch = Patch | FeaturePatch;

export interface TextureInfo {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

export interface AtlasInfo {
  readonly key: string;
  readonly frameCount: number;
  readonly textureWidth: number;
  readonly textureHeight: number;
}

export interface HostEvents {
  entitySelected: { entity: GameEntity | null };
  sceneChanged: { scene: Scene | null };
  patchApplied: { patch: AnyPatch };
  patchCleared: { patchId: PatchId };
  errorLogged: { entry: LogEntry };
}

export interface DevToolsHost {
  readonly app: ReadonlyRef<Application | null>;
  readonly frameStats: ReadonlyRef<FrameStatsSummary>;
  readonly activeScene: ReadonlyRef<Scene | null>;
  readonly features: FeatureState;
  readonly entities: ReadonlyRef<readonly GameEntity[]>;
  readonly logs: ReadonlyRef<readonly LogEntry[]>;
  readonly patches: ReadonlyRef<readonly AnyPatch[]>;

  findByTag(tag: string): GameEntity[];
  textures(): TextureInfo[];
  atlases(): AtlasInfo[];

  /** Live value of a patched field. Returns null if no patch exists. */
  isPatched(entity: GameEntity, componentType: string, field: string): boolean;
  isFeaturePatched(key: string): boolean;

  /**
   * Apply a field patch. If a patch for this (entity, component, field)
   * already exists, the baseline is preserved and only the current value is
   * updated. Array-like values (Vec3, Quaternion, Float32Array) are mutated
   * in place to preserve the reference type and runtime methods.
   */
  setField(entity: GameEntity, component: Component, field: string, value: unknown): PatchId;
  setFeature(key: string, value: unknown): PatchId;
  pinPatch(id: PatchId): void;
  clearPatch(id: PatchId): void;
  clearAllPatches(): void;

  /**
   * Generate a code snippet describing all current patches.
   * Format: human-readable comment block suitable for pasting into source.
   */
  exportPatches(): string;

  on<K extends keyof HostEvents>(event: K, cb: (data: HostEvents[K]) => void): () => void;
  emit<K extends keyof HostEvents>(event: K, data: HostEvents[K]): void;
}
