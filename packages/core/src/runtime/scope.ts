import type Application from "../Application";
import type Scene from "../Scene";
import type GameEntity from "../ecs/GameEntity";

/**
 * A single authoring scope frame. Each setup (defineApp / defineScene /
 * defineEntity / defineUI) pushes a frame while its body runs; reactive
 * primitives like `watch` and `computed` register cleanups onto whichever
 * frame sits on top of the stack.
 *
 * `app` / `scene` / `entity` / `ui` are separate kinds because they can
 * be pushed independently; `findScope(kind)` walks back to the innermost
 * frame of that kind. An entity setup inside a scene inside an app sees
 * three stacked frames and resolves `findScope("app")` through them.
 *
 * Cleanup buckets live on every kind — any frame can collect teardown
 * callbacks from `registerCleanup()`. That unifies what used to be
 * `beginCleanupScope` + parallel `thisEntity` / `thisUI` / `isInUIScope`
 * singletons into one stack.
 */
export type Scope =
  | { kind: "app"; app: Application; cleanups: Set<() => void> }
  | { kind: "scene"; scene: Scene; cleanups: Set<() => void> }
  | {
      kind: "entity";
      entity: GameEntity;
      parent: GameEntity | null;
      cleanups: Set<() => void>;
    }
  | { kind: "ui"; ui: unknown; cleanups: Set<() => void> }
  | { kind: "cleanup"; cleanups: Set<() => void> };

const stack: Scope[] = [];

export function pushScope(scope: Scope): () => void {
  stack.push(scope);
  let popped = false;
  return () => {
    if (popped) return;
    popped = true;
    // Best-effort strict-pop: usually the top is our scope, but nested
    // async / error paths may have popped above us. Find and remove.
    const idx = stack.lastIndexOf(scope);
    if (idx < 0) return;
    stack.splice(idx, 1);
  };
}

export function currentScope(): Scope | null {
  return stack[stack.length - 1] ?? null;
}

export function findScope<K extends Scope["kind"]>(kind: K): Extract<Scope, { kind: K }> | null {
  for (let i = stack.length - 1; i >= 0; i--) {
    const s = stack[i];
    if (s.kind === kind) return s as Extract<Scope, { kind: K }>;
  }
  return null;
}

export function hasScope(kind: Scope["kind"]): boolean {
  return findScope(kind) !== null;
}

/** Register a cleanup callback on the innermost frame. No-op outside any scope. */
export function registerCleanup(fn: () => void): void {
  const current = stack[stack.length - 1];
  if (current) current.cleanups.add(fn);
}

/** True if any scope frame is on the stack (any kind). */
export function hasActiveCleanupScope(): boolean {
  return stack.length > 0;
}

/**
 * Backwards-compat helpers for the legacy cleanup-only API. New code
 * should push a typed scope (`{kind: "entity", ...}` etc.) via pushScope.
 */
export function beginCleanupScope(): Set<() => void> {
  const cleanups = new Set<() => void>();
  pushScope({ kind: "cleanup", cleanups });
  return cleanups;
}
export function endCleanupScope(): void {
  // Pop whatever's on top; assumes paired begin/end discipline.
  stack.pop();
}
