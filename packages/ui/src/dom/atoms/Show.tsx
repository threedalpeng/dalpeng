import type { ReadonlyRef } from "@dalpeng/core";
import type { UIElement } from "../../core/element";
import type { Cleanup } from "../bindings";
import { renderElement } from "../render";

export interface ShowOpts {
  when: ReadonlyRef<boolean>;
  body: UIElement;
  fallback?: UIElement;
}

/**
 * Body + fallback are each rendered at most once per mount. Flipping `when`
 * back and forth detaches / reattaches the cached element — internal ref
 * subscriptions and DOM state survive the round trip.
 */
export function Show(opts: ShowOpts): UIElement {
  return <div style={{ display: "contents" }} ref={(el) => initShow(el as HTMLElement, opts)} />;
}

interface Slot {
  element: Node;
  cleanups: Set<Cleanup>;
  afterMount: Array<() => void>;
}

function flushAfterMount(slot: Slot): void {
  for (const cb of slot.afterMount) {
    try {
      cb();
    } catch (err) {
      console.error("[Show afterMount]", err);
    }
  }
  slot.afterMount.length = 0;
}

function teardownSlot(slot: Slot): void {
  const arr = Array.from(slot.cleanups);
  for (let i = arr.length - 1; i >= 0; i--) {
    try {
      arr[i]();
    } catch (err) {
      console.error("[Show cleanup]", err);
    }
  }
  slot.cleanups.clear();
}

function initShow(wrap: HTMLElement, opts: ShowOpts): Cleanup {
  const ctx = { doc: wrap.ownerDocument };
  let bodySlot: Slot | null = null;
  let fallbackSlot: Slot | null = null;
  let current: "body" | "fallback" | null = null;

  const ensureBody = (): Slot => {
    if (!bodySlot) {
      const r = renderElement(opts.body, ctx);
      bodySlot = { element: r.element, cleanups: r.cleanups, afterMount: r.afterMount };
    }
    return bodySlot;
  };
  const ensureFallback = (): Slot | null => {
    if (!opts.fallback) return null;
    if (!fallbackSlot) {
      const r = renderElement(opts.fallback, ctx);
      fallbackSlot = { element: r.element, cleanups: r.cleanups, afterMount: r.afterMount };
    }
    return fallbackSlot;
  };

  const sync = (): void => {
    const targetKind: "body" | "fallback" = opts.when.value ? "body" : "fallback";
    if (targetKind === current) return;

    const prev = current === "body" ? bodySlot : current === "fallback" ? fallbackSlot : null;
    if (prev && prev.element.parentNode === wrap) wrap.removeChild(prev.element);

    const next = targetKind === "body" ? ensureBody() : ensureFallback();
    if (next) {
      wrap.appendChild(next.element);
      if (next.afterMount.length > 0) flushAfterMount(next);
    }
    current = targetKind;
  };

  sync();
  const unsubWhen = opts.when.subscribe(() => sync());

  return () => {
    unsubWhen();
    if (bodySlot) teardownSlot(bodySlot);
    if (fallbackSlot) teardownSlot(fallbackSlot);
    bodySlot = null;
    fallbackSlot = null;
    current = null;
  };
}
