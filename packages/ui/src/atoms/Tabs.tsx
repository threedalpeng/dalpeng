import type { ReadonlyRef, Ref } from "@dalpeng/core";
import type { Cleanup } from "../bindings";
import { h, type UIElement } from "../element";
import { renderElement } from "../render";

export interface TabSpec {
  id: string;
  title: string;
  body: UIElement;
}

export interface TabsOpts {
  tabs: ReadonlyRef<readonly TabSpec[]>;
  active: Ref<number>;
  /** Fires on tab dragstart — for host DnD orchestrators. Optional. */
  onDragStart?: (tabId: string, ev: MouseEvent) => void;
  /** Data attributes applied to the tabs root. Used for drop-zone hit-tests. */
  dataAttrs?: Record<string, string>;
}

/**
 * Body cache keyed by `tab.id`. Switching tabs detaches the previous body
 * (DOM + subscriptions survive) and attaches the target, rendering on first
 * visit. Tabs dropped from the list tear down their cached body.
 */
export function Tabs(opts: TabsOpts): UIElement {
  const wrap = h("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      overflow: "hidden",
    },
    ref: (el) => initTabs(el as HTMLElement, opts),
    ...(opts.dataAttrs ?? {}),
  });
  return wrap;
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
      console.error("[Tabs afterMount]", err);
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
      console.error("[Tabs cleanup]", err);
    }
  }
  slot.cleanups.clear();
}

function initTabs(wrap: HTMLElement, opts: TabsOpts): Cleanup {
  const doc = wrap.ownerDocument;
  const ctx = { doc };

  const strip = doc.createElement("div");
  strip.style.cssText =
    "display:flex;flex-direction:row;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);overflow-x:auto;min-height:26px";
  const body = doc.createElement("div");
  body.style.cssText = "flex:1;min-height:0;overflow:auto";
  wrap.appendChild(strip);
  wrap.appendChild(body);

  const cache = new Map<string, Slot>();
  let currentId: string | null = null;

  const detachCurrent = (): void => {
    if (currentId === null) return;
    const prev = cache.get(currentId);
    if (prev && prev.element.parentNode === body) body.removeChild(prev.element);
    currentId = null;
  };

  const showActive = (): void => {
    const tabs = opts.tabs.value;
    const idx = Math.max(0, Math.min(opts.active.value, tabs.length - 1));
    const active = tabs[idx];
    if (!active) {
      detachCurrent();
      return;
    }
    if (active.id === currentId) return;
    detachCurrent();

    let slot = cache.get(active.id);
    if (!slot) {
      const r = renderElement(active.body, ctx);
      slot = { element: r.element, cleanups: r.cleanups, afterMount: r.afterMount };
      cache.set(active.id, slot);
    }
    body.appendChild(slot.element);
    if (slot.afterMount.length > 0) flushAfterMount(slot);
    currentId = active.id;
  };

  const pruneStale = (): void => {
    const liveIds = new Set(opts.tabs.value.map((t) => t.id));
    for (const [id, slot] of cache) {
      if (liveIds.has(id)) continue;
      teardownSlot(slot);
      if (slot.element.parentNode) slot.element.parentNode.removeChild(slot.element);
      cache.delete(id);
      if (id === currentId) currentId = null;
    }
  };

  const renderStrip = (): void => {
    while (strip.firstChild) strip.removeChild(strip.firstChild);
    const tabs = opts.tabs.value;
    const activeIdx = opts.active.value;
    tabs.forEach((tab, i) => {
      const btn = doc.createElement("button");
      btn.type = "button";
      btn.textContent = tab.title;
      const isActive = i === activeIdx;
      btn.style.cssText = `background:${isActive ? "rgba(255,255,255,0.06)" : "transparent"};color:${isActive ? "inherit" : "rgba(255,255,255,0.6)"};border:none;border-right:1px solid rgba(255,255,255,0.06);border-bottom:${isActive ? "2px solid currentColor" : "2px solid transparent"};padding:5px 12px;cursor:pointer;font:inherit;flex-shrink:0`;
      btn.addEventListener("click", () => {
        opts.active.value = i;
      });
      if (opts.onDragStart) {
        const handler = opts.onDragStart;
        btn.addEventListener("mousedown", (ev) => {
          if (ev.button !== 0) return;
          handler(tab.id, ev);
        });
      }
      strip.appendChild(btn);
    });
  };

  renderStrip();
  showActive();

  const unsubTabs = opts.tabs.subscribe(() => {
    pruneStale();
    renderStrip();
    showActive();
  });
  const unsubActive = opts.active.subscribe(() => {
    renderStrip();
    showActive();
  });

  return () => {
    unsubTabs();
    unsubActive();
    for (const slot of cache.values()) teardownSlot(slot);
    cache.clear();
    currentId = null;
  };
}
