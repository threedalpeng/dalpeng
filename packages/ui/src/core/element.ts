import { isRef, type ReadonlyRef } from "@dalpeng/core";
import type { Cleanup } from "./context";
import type { Style } from "./style";

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
 * Escape hatch — wraps a pre-existing DOM Node so it can live in a UIElement
 * tree. The `adopt()` factory ships with the DOM backend (`@dalpeng/ui/dom`);
 * scene backends will define their own analogue with a backend-specific node
 * type. The element field is typed `Node` here for the DOM case — future
 * work may generalize to `AdoptedElement<T>`.
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

/**
 * DOM event handler surface every HostProps accepts. camelCase (`onClick`)
 * matches the JSX-ecosystem convention; runtime lowercases for
 * `addEventListener`. The event-argument type is inferred so consumers get
 * autocomplete without needing to annotate the handler.
 */
export interface HostEventHandlers {
  onClick?: (e: MouseEvent) => void;
  onDblClick?: (e: MouseEvent) => void;
  onContextMenu?: (e: MouseEvent) => void;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  onMouseDown?: (e: MouseEvent) => void;
  onMouseUp?: (e: MouseEvent) => void;
  onMouseMove?: (e: MouseEvent) => void;
  onMouseOver?: (e: MouseEvent) => void;
  onMouseOut?: (e: MouseEvent) => void;
  onPointerDown?: (e: PointerEvent) => void;
  onPointerUp?: (e: PointerEvent) => void;
  onPointerMove?: (e: PointerEvent) => void;
  onPointerEnter?: (e: PointerEvent) => void;
  onPointerLeave?: (e: PointerEvent) => void;
  onPointerCancel?: (e: PointerEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  onKeyUp?: (e: KeyboardEvent) => void;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
  onFocusIn?: (e: FocusEvent) => void;
  onFocusOut?: (e: FocusEvent) => void;
  onChange?: (e: Event) => void;
  onInput?: (e: Event) => void;
  onSubmit?: (e: SubmitEvent) => void;
  onReset?: (e: Event) => void;
  onInvalid?: (e: Event) => void;
  onScroll?: (e: Event) => void;
  onWheel?: (e: WheelEvent) => void;
  onCopy?: (e: ClipboardEvent) => void;
  onCut?: (e: ClipboardEvent) => void;
  onPaste?: (e: ClipboardEvent) => void;
  onDragStart?: (e: DragEvent) => void;
  onDragEnd?: (e: DragEvent) => void;
  onDragEnter?: (e: DragEvent) => void;
  onDragLeave?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
  onTouchStart?: (e: TouchEvent) => void;
  onTouchEnd?: (e: TouchEvent) => void;
  onTouchMove?: (e: TouchEvent) => void;
  onTouchCancel?: (e: TouchEvent) => void;
  onAnimationStart?: (e: AnimationEvent) => void;
  onAnimationEnd?: (e: AnimationEvent) => void;
  onAnimationIteration?: (e: AnimationEvent) => void;
  onTransitionEnd?: (e: TransitionEvent) => void;
  onError?: (e: Event) => void;
  onLoad?: (e: Event) => void;
}

/** Common HTML attributes typed so typos surface. Per-tag attrs (e.g. `type` on `<input>`) fall through the index signature. */
export interface HostCommonAttrs {
  id?: string;
  class?: string | ReadonlyRef<string>;
  title?: string;
  role?: string;
  tabIndex?: number;
  hidden?: boolean;
  draggable?: boolean;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  contentEditable?: boolean | "inherit";
  spellCheck?: boolean;
  slot?: string;
}

export interface HostProps extends HostEventHandlers, HostCommonAttrs {
  children?: Child;
  /** Fires after DOM subtree attaches (post-commit). Return a Cleanup to tear down. */
  ref?: (el: Element) => void | (() => void);
  style?: Style | ReadonlyRef<Style>;
  /** Escape hatch for per-tag attrs + `data-*` / `aria-*` / SVG-specific props. */
  [key: string]: unknown;
}

export const Fragment = Symbol.for("dalpeng.ui.Fragment");
export type FragmentTag = typeof Fragment;

const FRAGMENT_KIND = "fragment" as const;
const COMPONENT_KIND = "component" as const;
const HOST_KIND = "host" as const;
const TEXT_KIND = "text" as const;
const ADOPTED_KIND = "adopted" as const;

export function defineComponent<P = Record<string, never>>(
  setup: (props: P) => UIElement
): Component<P> {
  // Setup runs once per component instance. Ref props patch bindings, not setup.
  return (props: P) => setup(props);
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

/** Internal — used by `adopt()` in `dom/adopt.ts`. Not exported from public API. */
export const ADOPTED_KIND_SYMBOL = ADOPTED_KIND;

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
