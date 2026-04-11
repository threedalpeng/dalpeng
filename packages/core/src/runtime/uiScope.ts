let depth = 0;

export function enterUIScope(): void {
  depth++;
}

export function leaveUIScope(): void {
  depth = Math.max(0, depth - 1);
}

export function isInUIScope(): boolean {
  return depth > 0;
}
