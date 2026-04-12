import { DESCRIPTOR_KIND, createGameDescriptor, createUIDescriptor } from "./runtime/Descriptor";

export { DESCRIPTOR_KIND as APP_NODE_KIND };

export const createEntityNode = createGameDescriptor as <P>(
  setup: (props: P) => readonly AppNode[] | void,
  props: P
) => EntityNode;

export const createUINode = createUIDescriptor as <P>(
  setup: (props: P) => readonly unknown[],
  props: P
) => UINode;

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
