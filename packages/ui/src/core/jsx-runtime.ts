import { createElement, Fragment, type Child, type HostProps, type UIElement } from "./element";

export { Fragment };

interface JsxProps {
  children?: Child | Child[];
  [key: string]: unknown;
}

function jsxImpl(type: unknown, props: JsxProps | null): unknown {
  const safeProps = props ?? {};
  const { children, ...rest } = safeProps;
  if (children === undefined) {
    return (createElement as unknown as (...args: unknown[]) => unknown)(type, rest);
  }
  if (Array.isArray(children)) {
    return (createElement as unknown as (...args: unknown[]) => unknown)(type, rest, ...children);
  }
  return (createElement as unknown as (...args: unknown[]) => unknown)(type, rest, children);
}

export const jsx = jsxImpl;
export const jsxs = jsxImpl;
export const jsxDEV = jsxImpl;

// JSX namespace declared directly in the jsx-runtime module so TypeScript's
// automatic runtime lookup (jsxImportSource) finds IntrinsicElements / Element.
// Re-exporting via `export type { JSX }` from a separate module doesn't always
// reconstitute the namespace for JSX resolution (varies across TS versions).
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
