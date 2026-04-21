import { pushScope, registerCleanup } from "@dalpeng/core";
import {
  bindAttr,
  bindClass,
  bindStyle,
  bindText,
  listen,
  type Cleanup,
  type StyleLiteral,
} from "./bindings";
import {
  isComponent,
  isFragment,
  isHost,
  isText,
  type ComponentElement,
  type FragmentElement,
  type HostElement,
  type HostProps,
  type TextElement,
  type UIElement,
} from "./element";

export interface RenderContext {
  readonly doc: Document;
}

export interface RenderResult {
  readonly element: Node;
  readonly cleanups: Set<Cleanup>;
  /**
   * Callbacks queued during build, flushed by `mount().commit()` once the
   * subtree is attached. Ref props live here — `element.isConnected` is true
   * only after attach, so we must not call refs during build.
   */
  readonly afterMount: Array<() => void>;
}

const RESERVED_HOST_PROPS = new Set(["children", "ref", "class", "style"]);

export function renderElement(el: UIElement, ctx: RenderContext): RenderResult {
  const cleanups = new Set<Cleanup>();
  const afterMount: Array<() => void> = [];
  const pop = pushScope({ kind: "cleanup", cleanups });
  try {
    const node = buildElement(el, ctx, cleanups, afterMount);
    return { element: node, cleanups, afterMount };
  } finally {
    pop();
  }
}

function buildElement(
  el: UIElement,
  ctx: RenderContext,
  cleanups: Set<Cleanup>,
  afterMount: Array<() => void>
): Node {
  if (isHost(el)) return buildHost(el, ctx, cleanups, afterMount);
  if (isComponent(el)) return buildComponent(el, ctx, cleanups, afterMount);
  if (isText(el)) return buildText(el, ctx);
  if (isFragment(el)) return buildFragment(el, ctx, cleanups, afterMount);
  throw new Error("Unknown UIElement kind");
}

function buildHost(
  el: HostElement,
  ctx: RenderContext,
  cleanups: Set<Cleanup>,
  afterMount: Array<() => void>
): HTMLElement {
  const node = ctx.doc.createElement(el.tag);
  applyHostProps(node, el.props, cleanups, afterMount);
  attachChildren(node, el.children, ctx, afterMount);
  return node;
}

function buildComponent(
  el: ComponentElement<unknown>,
  ctx: RenderContext,
  cleanups: Set<Cleanup>,
  afterMount: Array<() => void>
): Node {
  // Setup runs exactly once per instance. Ref-prop updates never re-invoke.
  const result = el.component(el.props);
  return buildElement(result, ctx, cleanups, afterMount);
}

function buildText(el: TextElement, ctx: RenderContext): Text {
  const node = ctx.doc.createTextNode("");
  bindText(node, el.value);
  return node;
}

function buildFragment(
  el: FragmentElement,
  ctx: RenderContext,
  _cleanups: Set<Cleanup>,
  afterMount: Array<() => void>
): DocumentFragment {
  const frag = ctx.doc.createDocumentFragment();
  attachChildren(frag, el.children, ctx, afterMount);
  return frag;
}

function attachChildren(
  parent: Node,
  children: readonly UIElement[],
  ctx: RenderContext,
  afterMount: Array<() => void>
): void {
  for (const child of children) {
    const childResult = renderElement(child, ctx);
    parent.appendChild(childResult.element);
    for (const cb of childResult.afterMount) afterMount.push(cb);
    // LIFO: child teardown runs AFTER the parent's ref cleanup (which is added
    // during commit, later) and BEFORE the parent's bind/listen cleanups (which
    // were added before this). Reverse iteration of the Set gives that order.
    registerCleanup(() => teardown(childResult.cleanups));
  }
}

function applyHostProps(
  node: HTMLElement,
  props: HostProps,
  cleanups: Set<Cleanup>,
  afterMount: Array<() => void>
): void {
  for (const key of Object.keys(props)) {
    if (RESERVED_HOST_PROPS.has(key)) continue;
    const val = props[key];
    if (val === undefined) continue;
    if (isEventProp(key)) {
      if (typeof val === "function") {
        listen(node, domEventName(key), val as EventListener);
      }
      continue;
    }
    // Regular attribute; Ref handling lives inside bindAttr.
    bindAttr(node, key, val as never);
  }

  if (props.class !== undefined) {
    bindClass(node, props.class as string);
  }
  if (props.style !== undefined) {
    bindStyle(node, props.style as StyleLiteral);
  }

  if (typeof props.ref === "function") {
    const refFn = props.ref;
    afterMount.push(() => {
      const maybeCleanup = refFn(node);
      if (typeof maybeCleanup === "function") {
        // Ref cleanup registered post-commit. Since afterMount flushes at root
        // commit, we're outside the build-time scope stack — register directly.
        cleanups.add(idempotent(maybeCleanup));
      }
    });
  }
}

function isEventProp(key: string): boolean {
  return key.length > 2 && key.startsWith("on") && key.charAt(2) === key.charAt(2).toUpperCase();
}

function domEventName(prop: string): string {
  return prop.slice(2).toLowerCase();
}

function idempotent(fn: Cleanup): Cleanup {
  let called = false;
  return () => {
    if (called) return;
    called = true;
    fn();
  };
}

function teardown(cleanups: Set<Cleanup>): void {
  const arr = Array.from(cleanups);
  // Reverse iteration = LIFO relative to registration order.
  for (let i = arr.length - 1; i >= 0; i--) {
    try {
      arr[i]();
    } catch (err) {
      // Cleanup must be resilient — log and continue so one bad cleanup doesn't orphan others.
      console.error("[ui cleanup]", err);
    }
  }
  cleanups.clear();
}

export interface MountHandle {
  readonly element: Node;
  /** Attach-after hook — flushes ref callbacks. Caller runs after appending `element` to live DOM. */
  commit(): void;
  /** Runs cleanups LIFO. DOM node removal is the caller's responsibility. */
  unmount(): void;
  readonly result: RenderResult;
}

export function mount(el: UIElement, ctx: RenderContext): MountHandle {
  const result = renderElement(el, ctx);
  let committed = false;
  let unmounted = false;
  return {
    element: result.element,
    commit() {
      if (committed || unmounted) return;
      committed = true;
      for (const cb of result.afterMount) {
        try {
          cb();
        } catch (err) {
          console.error("[ui commit]", err);
        }
      }
      result.afterMount.length = 0;
    },
    unmount() {
      if (unmounted) return;
      unmounted = true;
      teardown(result.cleanups);
    },
    result,
  };
}
