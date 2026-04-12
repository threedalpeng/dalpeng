import {
  computed,
  Logger,
  ref,
  type Application,
  type FrameStatsSummary,
  type GameEntity,
  type LogEntry,
  type ReadonlyRef,
  type Scene,
} from "@dalpeng/core";
import type { DevToolsHost } from "./host";

const EMPTY_ENTITIES: readonly GameEntity[] = Object.freeze([]);
const DEFAULT_FRAME_STATS: FrameStatsSummary = {
  fps: 0,
  frameTime: 0,
  drawCalls: 0,
  triangles: 0,
};

/**
 * Build a `DevToolsHost` for the given Application.
 *
 * Pass `null` initially if the app isn't ready yet, then call `attachApp(app)`
 * once it is. Plugins registered before `attachApp` will see live data as soon
 * as the app is bound.
 */
export function createDevToolsHost(initial: Application | null = null): {
  host: DevToolsHost;
  attachApp(app: Application): void;
  detach(): void;
} {
  const appRef = ref<Application | null>(initial);

  // Each ref is mirrored through a `computed` so the host can swap the
  // underlying app (e.g. HMR) without breaking existing subscribers.
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

  const host: DevToolsHost = {
    frameStats,
    activeScene,
    app: appRef,
    // Forwards the live proxy when available; plugins reading features before
    // app-ready will see undefined, which is fine — panels don't render until
    // after app ready.
    get features() {
      return appRef.value?.features ?? ({} as Application["features"]);
    },
    entities,
    findByTag(tag: string): GameEntity[] {
      return activeScene.value?.findByTag(tag) ?? [];
    },
    logs,
  };

  return {
    host,
    attachApp(app: Application) {
      appRef.value = app;
    },
    detach() {
      appRef.value = null;
    },
  };
}
