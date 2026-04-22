import { hasActiveCleanupScope, isRef, registerCleanup, type ReadonlyRef } from "@dalpeng/core";
import { expandShortcut, resolveStyleValue, type Style } from "./style";

export type Cleanup = () => void;

/** All cleanups returned from bind* / listen are idempotent — calling twice is a safe no-op. */
function idempotent(fn: Cleanup): Cleanup {
  let called = false;
  return () => {
    if (called) return;
    called = true;
    fn();
  };
}

/** Register with the active scope cleanup bucket if one exists — callers outside scope own the returned unsub. */
function autoRegister(fn: Cleanup): Cleanup {
  const wrapped = idempotent(fn);
  if (hasActiveCleanupScope()) registerCleanup(wrapped);
  return wrapped;
}

export function bindText(
  node: Node,
  value: string | number | ReadonlyRef<string | number>
): Cleanup {
  if (!isRef(value)) {
    node.textContent = String(value);
    return autoRegister(() => {});
  }
  const ref = value as ReadonlyRef<string | number>;
  node.textContent = String(ref.value);
  const unsub = ref.subscribe((next) => {
    node.textContent = String(next);
  });
  return autoRegister(unsub);
}

export type AttrValue = string | number | boolean | null | undefined;

export function bindAttr(
  el: Element,
  attr: string,
  value: AttrValue | ReadonlyRef<AttrValue>
): Cleanup {
  const apply = (v: AttrValue): void => {
    if (v == null || v === false) {
      el.removeAttribute(attr);
      return;
    }
    el.setAttribute(attr, v === true ? "" : String(v));
  };

  if (!isRef(value)) {
    apply(value as AttrValue);
    return autoRegister(() => {});
  }
  const ref = value as ReadonlyRef<AttrValue>;
  apply(ref.value);
  const unsub = ref.subscribe((next) => apply(next));
  return autoRegister(unsub);
}

export function bindClass(el: Element, value: string | ReadonlyRef<string>): Cleanup {
  if (!isRef(value)) {
    if (value) el.setAttribute("class", value);
    return autoRegister(() => {});
  }
  const ref = value as ReadonlyRef<string>;
  el.setAttribute("class", ref.value || "");
  const unsub = ref.subscribe((next) => {
    if (next) el.setAttribute("class", next);
    else el.removeAttribute("class");
  });
  return autoRegister(unsub);
}

export type { Style };

/**
 * Apply a style object to `el`. Handles theme tokens (`$color.accent`),
 * length shortcuts (`padding: 4` → `"4px"`), unitless passthrough
 * (`opacity: 0.5`), multi-property shortcuts (`paddingX` → left + right),
 * and CSS custom properties (`--panel-alpha`). Per-property Refs install a
 * subscription each.
 */
export function bindStyle(el: HTMLElement, style: Style): Cleanup {
  const cleanups: Cleanup[] = [];
  for (const key of Object.keys(style)) {
    const val = style[key];
    if (val === undefined) continue;
    const targets = expandShortcut(key);
    if (isRef(val)) {
      const ref = val as ReadonlyRef<string | number>;
      for (const k of targets) applyStyleProp(el, k, ref.value);
      const unsub = ref.subscribe((next) => {
        for (const k of targets) applyStyleProp(el, k, next);
      });
      cleanups.push(unsub);
    } else {
      for (const k of targets) applyStyleProp(el, k, val);
    }
  }
  if (cleanups.length === 0) return autoRegister(() => {});
  return autoRegister(() => {
    for (const c of cleanups) c();
  });
}

function applyStyleProp(el: HTMLElement, key: string, value: string | number): void {
  const resolved = resolveStyleValue(key, value);
  if (key.startsWith("--")) {
    el.style.setProperty(key, resolved);
    return;
  }
  // @ts-expect-error — CSSStyleDeclaration indexed access is valid for camelCase keys.
  el.style[key] = resolved;
}

export function listen<K extends keyof GlobalEventHandlersEventMap>(
  target: EventTarget,
  event: K,
  handler: (ev: GlobalEventHandlersEventMap[K]) => void,
  opts?: AddEventListenerOptions
): Cleanup;
export function listen(
  target: EventTarget,
  event: string,
  handler: EventListener,
  opts?: AddEventListenerOptions
): Cleanup;
export function listen(
  target: EventTarget,
  event: string,
  handler: EventListener,
  opts?: AddEventListenerOptions
): Cleanup {
  target.addEventListener(event, handler, opts);
  return autoRegister(() => target.removeEventListener(event, handler, opts));
}
