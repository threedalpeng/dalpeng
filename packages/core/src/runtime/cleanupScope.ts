const cleanupStack: Set<() => void>[] = [];

export function beginCleanupScope(): Set<() => void> {
  const scope = new Set<() => void>();
  cleanupStack.push(scope);
  return scope;
}

export function endCleanupScope(): void {
  cleanupStack.pop();
}

/** Silently no-ops when called outside a scope. */
export function registerCleanup(fn: () => void): void {
  const current = cleanupStack[cleanupStack.length - 1];
  if (current) {
    current.add(fn);
  }
}

export function hasActiveCleanupScope(): boolean {
  return cleanupStack.length > 0;
}
