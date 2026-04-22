import { isRef, type ReadonlyRef } from "@dalpeng/core";
import type { Cleanup } from "./bindings";

export type UIElement =
  | HostElement
  | ComponentElement<unknown>
  | TextElement
  | FragmentElement
  | AdoptedElement;

export interface HostElement {
  readonly kind: "host";
  readonly tag: string;
  readonly props: HostProps;
  readonly children: readonly UIElement[];
}

export interface ComponentElement<P> {
  readonly kind: "component";
  readonly component: Component<P>;
  readonly props: P;
}

export interface TextElement {
  readonly kind: "text";
  readonly value: string | number | ReadonlyRef<string | number>;
}

export interface FragmentElement {
  readonly kind: "fragment";
  readonly children: readonly UIElement[];
}

/**
 * Escape hatch — wraps a pre-existing DOM node so it can live in a UIElement
 * tree. The renderer appends the node as-is and registers the supplied
 * cleanups. For imperative DOM that can't be expressed with atoms.
 */
export interface AdoptedElement {
  readonly kind: "adopted";
  readonly element: Node;
  readonly cleanups?: ReadonlySet<Cleanup>;
}

export type Component<P = Record<string, never>> = (props: P) => UIElement;

export type Child =
  | UIElement
  | string
  | number
  | ReadonlyRef<string | number>
  | Child[]
  | boolean
  | null
  | undefined;

export type PropsWithChildren<P = Record<string, never>, C = Child> = P & {
  children?: C;
};

export interface HostProps {
  children?: Child;
  ref?: (el: Element) => void | (() => void);
  class?: string | ReadonlyRef<string>;
  style?: unknown;
  [key: string]: unknown;
}

export const Fragment = Symbol.for("dalpeng.ui.Fragment");
export type FragmentTag = typeof Fragment;

const FRAGMENT_KIND = "fragment" as const;
const COMPONENT_KIND = "component" as const;
const HOST_KIND = "host" as const;
const TEXT_KIND = "text" as const;
const ADOPTED_KIND = "adopted" as const;

/** Wrap an imperatively-built DOM node as a UIElement. Optional cleanups fire on unmount. */
export function adopt(element: Node, cleanups?: ReadonlySet<Cleanup>): AdoptedElement {
  return { kind: ADOPTED_KIND, element, cleanups };
}

export function createElement<P>(
  component: Component<P>,
  props: P | null,
  ...children: Child[]
): ComponentElement<P>;
export function createElement(tag: FragmentTag, props: null, ...children: Child[]): FragmentElement;
export function createElement(
  tag: string,
  props: HostProps | null,
  ...children: Child[]
): HostElement;
export function createElement(
  tag: string | FragmentTag | Component<unknown>,
  props: HostProps | Record<string, unknown> | null,
  ...children: Child[]
): UIElement {
  if (tag === Fragment) {
    return {
      kind: FRAGMENT_KIND,
      children: normalizeChildren(children),
    } satisfies FragmentElement;
  }

  if (typeof tag === "function") {
    const finalProps = { ...(props ?? {}) } as Record<string, unknown>;
    if (children.length > 0) {
      finalProps.children = children.length === 1 ? children[0] : children;
    }
    return {
      kind: COMPONENT_KIND,
      component: tag as Component<unknown>,
      props: finalProps,
    } satisfies ComponentElement<unknown>;
  }

  const hostProps = (props ?? {}) as HostProps;
  // JSX embeds children in props as well (automatic runtime). Prefer the
  // varargs form when caller provided it, else fall through to props.children.
  const childSource = children.length > 0 ? children : [];
  const normalized =
    childSource.length > 0
      ? normalizeChildren(childSource)
      : hostProps.children !== undefined
        ? normalizeChildren([hostProps.children])
        : [];
  return {
    kind: HOST_KIND,
    tag,
    props: hostProps,
    children: normalized,
  } satisfies HostElement;
}

export const h = createElement;

export function normalizeChildren(children: readonly Child[]): UIElement[] {
  const out: UIElement[] = [];
  walkChildren(children, out);
  return out;
}

function walkChildren(nodes: readonly Child[], out: UIElement[]): void {
  for (const node of nodes) {
    if (node == null || typeof node === "boolean") continue;
    if (Array.isArray(node)) {
      walkChildren(node, out);
      continue;
    }
    if (typeof node === "string" || typeof node === "number") {
      out.push({ kind: TEXT_KIND, value: node });
      continue;
    }
    if (isRef(node)) {
      // Only string|number Refs land as text nodes; other Ref shapes are
      // caught at bindStyle/bindAttr/prop level. Reactive UIElement subtrees
      // must flow through <Show>/<For> primitives — see plan §0 + §1.
      out.push({ kind: TEXT_KIND, value: node as ReadonlyRef<string | number> });
      continue;
    }
    out.push(node);
  }
}

export function isHost(el: UIElement): el is HostElement {
  return el.kind === HOST_KIND;
}
export function isComponent(el: UIElement): el is ComponentElement<unknown> {
  return el.kind === COMPONENT_KIND;
}
export function isText(el: UIElement): el is TextElement {
  return el.kind === TEXT_KIND;
}
export function isFragment(el: UIElement): el is FragmentElement {
  return el.kind === FRAGMENT_KIND;
}
export function isAdopted(el: UIElement): el is AdoptedElement {
  return el.kind === ADOPTED_KIND;
}
