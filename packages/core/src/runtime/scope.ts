import type Application from "../Application";
import type Scene from "../Scene";
import type GameEntity from "../ecs/GameEntity";

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
    // Nested async/error paths may pop above us — find-and-remove rather than blind pop.
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

/** No-op outside any scope. */
export function registerCleanup(fn: () => void): void {
  const current = stack[stack.length - 1];
  if (current) current.cleanups.add(fn);
}

export function hasActiveCleanupScope(): boolean {
  return stack.length > 0;
}

export function beginCleanupScope(): Set<() => void> {
  const cleanups = new Set<() => void>();
  pushScope({ kind: "cleanup", cleanups });
  return cleanups;
}
export function endCleanupScope(): void {
  stack.pop(); // assumes paired begin/end discipline
}
