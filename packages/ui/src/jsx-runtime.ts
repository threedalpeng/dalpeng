import { createElement, Fragment, type Child } from "./element";

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

export type { JSX } from "./jsx-types";
