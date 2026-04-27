import type { Component } from "@dalpeng/core";

export type FieldKind = "number" | "vec3" | "toggle" | "string" | "enum" | "color" | "readonly";

export interface FieldSchema {
  label?: string;
  kind: FieldKind;
  min?: number;
  max?: number;
  step?: number;
  unit?: "deg" | "rad";
  options?: readonly string[];
  formatter?: (value: unknown) => string;
  copyFormat?: (value: unknown) => string;
}

export interface ComponentSchema {
  /**
   * Display name shown in Inspector headers and used as the stable key for
   * patches / fold state. Falls back to `constructor.name` when omitted —
   * but that breaks under production minification (class names become
   * `mt`/`S`), so provide an explicit displayName for every built-in.
   */
  readonly displayName?: string;
  readonly fields: Readonly<Record<string, FieldSchema>>;
}

type ComponentCtor = new (...args: never[]) => Component;

const registry = new Map<ComponentCtor, ComponentSchema>();

export function registerComponentSchema(ctor: ComponentCtor, schema: ComponentSchema): void {
  registry.set(ctor, schema);
}

export function getComponentSchema(component: Component): ComponentSchema | null {
  return registry.get(component.constructor as ComponentCtor) ?? null;
}

/**
 * Stable, human-readable name for a component. Prefers the schema's
 * displayName, falls back to `constructor.name`. Every consumer that needs
 * to show or persist a component identity should call this. Never read
 * `component.constructor.name` directly.
 *
 * Production minification rewrites class names (e.g. `Health` to `mt`),
 * which breaks patch persistence keyed by component type. We warn once per
 * unregistered ctor so the issue surfaces during development; the cure is
 * to call `registerComponentSchema(MyComponent, { displayName: "..." })`.
 */
export function componentDisplayName(component: Component): string {
  const ctor = component.constructor as ComponentCtor;
  const schema = registry.get(ctor);
  if (schema?.displayName) return schema.displayName;
  warnMissingDisplayName(ctor);
  return ctor.name;
}

const warnedCtors = new WeakSet<ComponentCtor>();
function warnMissingDisplayName(ctor: ComponentCtor): void {
  if (warnedCtors.has(ctor)) return;
  warnedCtors.add(ctor);
  console.warn(
    `[devtools] component "${ctor.name}" has no registered schema; patches keyed by ` +
      `class name will break in production builds (minification). Call ` +
      `registerComponentSchema(${ctor.name}, { displayName: "..." }) to fix.`
  );
}

/** True if a schema is registered for this component's class. */
export function hasComponentSchema(component: Component): boolean {
  return registry.has(component.constructor as ComponentCtor);
}

export function numberField(opts: Partial<Omit<FieldSchema, "kind">> = {}): FieldSchema {
  return { kind: "number", step: 0.1, ...opts };
}

export function vec3Field(
  opts: Partial<Omit<FieldSchema, "kind">> & { unit?: "deg" | "rad" } = {}
): FieldSchema {
  return { kind: "vec3", step: 0.1, ...opts };
}

export function toggleField(opts: Partial<Omit<FieldSchema, "kind">> = {}): FieldSchema {
  return { kind: "toggle", ...opts };
}

export function stringField(opts: Partial<Omit<FieldSchema, "kind">> = {}): FieldSchema {
  return { kind: "string", ...opts };
}

export function enumField(
  options: readonly string[],
  opts: Partial<Omit<FieldSchema, "kind" | "options">> = {}
): FieldSchema {
  return { kind: "enum", options, ...opts };
}

export function readonlyField(
  formatter?: (value: unknown) => string,
  opts: Partial<Omit<FieldSchema, "kind" | "formatter">> = {}
): FieldSchema {
  return { kind: "readonly", formatter, ...opts };
}

// ── Copy formatters ──────────────────────────────────────────────────

export function vec3CodeFormat(value: unknown): string {
  const arr = value as ArrayLike<number>;
  const x = arr[0] ?? 0;
  const y = arr[1] ?? 0;
  const z = arr[2] ?? 0;
  return `vec3(${x}, ${y}, ${z})`;
}

export function quatCodeFormat(value: unknown): string {
  const arr = value as ArrayLike<number>;
  const x = arr[0] ?? 0;
  const y = arr[1] ?? 0;
  const z = arr[2] ?? 0;
  const w = arr[3] ?? 1;
  return `new Quaternion([${x}, ${y}, ${z}, ${w}])`;
}
