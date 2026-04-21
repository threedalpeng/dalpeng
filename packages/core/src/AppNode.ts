import { DESCRIPTOR_KIND } from "./runtime/Descriptor";

export { DESCRIPTOR_KIND as APP_NODE_KIND };

export interface AppNode {
  readonly [DESCRIPTOR_KIND]: "game" | "ui";
}

export interface EntityNode extends AppNode {
  readonly [DESCRIPTOR_KIND]: "game";
  readonly setup: (props: unknown) => readonly AppNode[] | void;
  readonly props: unknown;
}

export interface UINode extends AppNode {
  readonly [DESCRIPTOR_KIND]: "ui";
  readonly setup: (props: unknown) => readonly unknown[];
  readonly props: unknown;
}
