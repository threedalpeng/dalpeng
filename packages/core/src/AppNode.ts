import { DESCRIPTOR_KIND } from "./runtime/Descriptor";

export { DESCRIPTOR_KIND as APP_NODE_KIND };

export interface AppNode {
  readonly [DESCRIPTOR_KIND]: "game" | "ui";
}

export interface EntityNode extends AppNode {
  readonly [DESCRIPTOR_KIND]: "game";
  readonly setup: (props: any) => readonly AppNode[] | void;
  readonly props: any;
}

export interface UINode extends AppNode {
  readonly [DESCRIPTOR_KIND]: "ui";
  readonly setup: (props: any) => readonly unknown[];
  readonly props: any;
}
