export const DESCRIPTOR_KIND: unique symbol = Symbol("dalpeng.descriptorKind");

export type DescriptorKind = "game" | "ui";

export interface Descriptor<K extends DescriptorKind = DescriptorKind> {
  readonly [DESCRIPTOR_KIND]: K;
}

export interface GameDescriptor<P = unknown> extends Descriptor<"game"> {
  readonly setup: (props: P) => readonly LogicalDescriptor[] | void;
  readonly props: P;
}

export interface UIDescriptor<P = unknown> extends Descriptor<"ui"> {
  readonly setup: (props: P) => readonly unknown[];
  readonly props: P;
}

// `any` is deliberate: LogicalDescriptor is the opaque walker type; using
// `unknown` breaks variance so concrete GameDescriptor<SomeProps> won't assign.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LogicalDescriptor = GameDescriptor<any> | UIDescriptor<any>;

export function isDescriptor(value: unknown): value is LogicalDescriptor {
  return (
    value !== null &&
    typeof value === "object" &&
    DESCRIPTOR_KIND in (value as object)
  );
}

export function isGameDescriptor(value: unknown): value is GameDescriptor {
  return isDescriptor(value) && value[DESCRIPTOR_KIND] === "game";
}

export function isUIDescriptor(value: unknown): value is UIDescriptor {
  return isDescriptor(value) && value[DESCRIPTOR_KIND] === "ui";
}

export function createGameDescriptor<P>(
  setup: (props: P) => readonly LogicalDescriptor[] | void,
  props: P,
): GameDescriptor<P> {
  return {
    [DESCRIPTOR_KIND]: "game",
    setup,
    props,
  };
}

export function createUIDescriptor<P>(
  setup: (props: P) => readonly unknown[],
  props: P,
): UIDescriptor<P> {
  return {
    [DESCRIPTOR_KIND]: "ui",
    setup,
    props,
  };
}
