import type { HostProps, UIElement } from "./element";

// JSX types must live in a `JSX` namespace — no module-syntax alternative.
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
  export type Element = UIElement;
  export interface ElementChildrenAttribute {
    children: Record<string, never>;
  }
  // Every HTML tag accepts HostProps. Stricter per-tag typing lands later.
  export interface IntrinsicElements {
    [tag: string]: HostProps;
  }
}

export {};
