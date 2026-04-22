import type { ReadonlyRef } from "@dalpeng/core";
import { h, type UIElement } from "../../core/element";
import type { Cleanup } from "../bindings";
import { renderElement } from "../render";

export interface ForOpts<T> {
  items: ReadonlyRef<readonly T[]>;
  render: (item: T, idx: number) => UIElement;
  empty?: UIElement;
  /**
   * Stable identity per item for key-based diffing. Default: the item itself
   * (fine for primitive arrays; provide explicitly for object arrays so
   * reference changes don't trigger rebuilds).
   */
  key?: (item: T, idx: number) => unknown;
}

/**
 * Key-based diffing list. Items with unchanged keys keep their DOM and
 * subscriptions; only added / removed / reordered slots touch DOM. The
 * dupe-key case gets a fresh slot rather than silently merging.
 */
export function For<T>(opts: ForOpts<T>): UIElement {
  return h("div", {
    style: { display: "flex", flexDirection: "column" },
    ref: (el) => initForReconciler(el as HTMLElement, opts),
  });
}

interface Slot {
  key: unknown;
  element: Node;
  cleanups: Set<Cleanup>;
  afterMount: Array<() => void>;
}

function flushAfterMount(slot: Slot): void {
  for (const cb of slot.afterMount) {
    try {
      cb();
    } catch (err) {
      console.error("[For afterMount]", err);
    }
  }
  slot.afterMount.length = 0;
}

function teardown(slot: Slot): void {
  const arr = Array.from(slot.cleanups);
  for (let i = arr.length - 1; i >= 0; i--) {
    try {
      arr[i]();
    } catch (err) {
      console.error("[For cleanup]", err);
    }
  }
  slot.cleanups.clear();
  if (slot.element.parentNode) slot.element.parentNode.removeChild(slot.element);
}

function initForReconciler<T>(wrap: HTMLElement, opts: ForOpts<T>): Cleanup {
  const ctx = { doc: wrap.ownerDocument };
  const keyOf = opts.key ?? ((item: T) => item as unknown);

  let slots: Slot[] = [];
  let emptySlot: Slot | null = null;

  const renderItem = (item: T, idx: number, key: unknown): Slot => {
    const desc = opts.render(item, idx);
    const r = renderElement(desc, ctx);
    return {
      key,
      element: r.element,
      cleanups: r.cleanups,
      afterMount: r.afterMount,
    };
  };

  const showEmpty = (): void => {
    if (!opts.empty || emptySlot) return;
    const r = renderElement(opts.empty, ctx);
    emptySlot = {
      key: undefined,
      element: r.element,
      cleanups: r.cleanups,
      afterMount: r.afterMount,
    };
    wrap.appendChild(r.element);
    flushAfterMount(emptySlot);
  };

  const hideEmpty = (): void => {
    if (!emptySlot) return;
    teardown(emptySlot);
    emptySlot = null;
  };

  const diff = (): void => {
    const items = opts.items.value;

    if (items.length === 0) {
      for (const s of slots) teardown(s);
      slots = [];
      showEmpty();
      return;
    }
    hideEmpty();

    const prevByKey = new Map<unknown, Slot>();
    for (const s of slots) prevByKey.set(s.key, s);

    const next: Slot[] = new Array(items.length);
    const claimed = new Set<unknown>();

    for (let i = 0; i < items.length; i++) {
      const key = keyOf(items[i], i);
      let slot: Slot | undefined;
      if (!claimed.has(key)) {
        slot = prevByKey.get(key);
        if (slot) {
          prevByKey.delete(key);
          claimed.add(key);
        }
      }
      if (!slot) {
        slot = renderItem(items[i], i, claimed.has(key) ? Symbol("dup") : key);
        claimed.add(slot.key);
      }
      next[i] = slot;
    }

    for (const stale of prevByKey.values()) teardown(stale);

    // Position pass — walk back-to-front so the reference node is already placed.
    for (let i = next.length - 1; i >= 0; i--) {
      const cur = next[i];
      const ref = next[i + 1]?.element ?? null;
      if (cur.element.parentNode !== wrap || cur.element.nextSibling !== ref) {
        wrap.insertBefore(cur.element, ref);
      }
      // First-time mount for this slot — flush its ref callbacks.
      if (cur.afterMount.length > 0) flushAfterMount(cur);
    }

    slots = next;
  };

  diff();
  const unsubItems = opts.items.subscribe(() => diff());

  return () => {
    unsubItems();
    for (const s of slots) teardown(s);
    if (emptySlot) teardown(emptySlot);
    slots = [];
    emptySlot = null;
  };
}
