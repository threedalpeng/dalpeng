import type {
  Application,
  FrameStatsSummary,
  GameEntity,
  LogEntry,
  ReadonlyRef,
  RenderConfig,
  Scene,
} from "@dalpeng/core";

/**
 * Reactive engine surface available to DevTools plugins.
 *
 * Plugins must NOT cast `host` to `Application`. Widen this interface instead
 * — that's the explicit boundary the plugin platform enforces.
 */
export interface DevToolsHost {
  /** Most-recent per-frame summary. */
  readonly frameStats: ReadonlyRef<FrameStatsSummary>;
  /** Currently active scene, or null. */
  readonly activeScene: ReadonlyRef<Scene | null>;
  readonly app: ReadonlyRef<Application | null>;
  /**
   * Mutable render feature flags — same reactive proxy as `app.features`.
   * Writes propagate to the engine immediately.
   */
  readonly features: RenderConfig;
  /** Reactive view over the active scene's entity set. */
  readonly entities: ReadonlyRef<readonly GameEntity[]>;
  findByTag(tag: string): GameEntity[];
  readonly logs: ReadonlyRef<readonly LogEntry[]>;
}
