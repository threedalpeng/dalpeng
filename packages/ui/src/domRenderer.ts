import { isRef, ref, type Ref, type UINode } from "@dalpeng/core";
import { pushUIScope, type UIContext } from "./context";
import type { Placement } from "./placement";
import type { TextOpts, UIChild } from "./types";

export interface RenderContext {
  doc: Document;
  /** Required for Toggle("key") bindings; omit for DevTools-level UI. */
  features?: Record<string, unknown>;
  watchFeature?: (key: string, cb: (newVal: unknown, oldVal: unknown) => void) => () => void;
}

export interface RenderResult {
  element: HTMLElement;
  cleanups: Set<() => void>;
  placement?: Placement;
  layer?: string;
}

export function renderUI(node: UINode, ctx: RenderContext): RenderResult {
  const uiCtx: UIContext = {
    nodes: [] as UIChild[],
    layout: { direction: "column", gap: 4 },
  };
  const { cleanups, pop } = pushUIScope(uiCtx);

  let nodes: UIChild[];
  let placement: Placement | undefined;
  let layerName: string | undefined;
  let layout: { direction: "column" | "row"; gap: number; align?: string };

  try {
    nodes = (node.setup as (p: unknown) => UIChild[])(node.props);
    placement = uiCtx.placement;
    layerName = uiCtx.layer;
    layout = { ...uiCtx.layout };
  } finally {
    pop();
  }

  const container = ctx.doc.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = layout.direction;
  container.style.gap = `${layout.gap}px`;
  if (layout.align) container.style.alignItems = layout.align;

  for (const node of nodes) {
    const result = renderNode(node, ctx);
    container.appendChild(result.element);
    result.cleanups.forEach((fn) => cleanups.add(fn));
  }

  return { element: container, cleanups, placement, layer: layerName };
}

function renderNode(node: UIChild, ctx: RenderContext): RenderResult {
  switch (node.type) {
    case "text":
      return renderText(node, ctx);
    case "bar":
      return renderBar(node);
    case "html":
      return renderHtml(node, ctx);
    case "toggle":
      return renderToggle(node, ctx);
    case "range":
      return renderRange(node, ctx);
    case "select":
      return renderSelect(node, ctx);
    case "button":
      return renderButton(node, ctx);
    case "value":
      return renderValue(node, ctx);
    case "ui":
      return renderUI(node.descriptor, ctx);
    case "menu":
      return renderMenu(node, ctx);
    case "list":
      return renderList(node, ctx);
    case "split":
      return renderSplit(node, ctx);
    case "tabs":
      return renderTabs(node, ctx);
    case "for":
      return renderFor(node, ctx);
    case "show":
      return renderShow(node, ctx);
    case "floating":
      return renderFloating(node, ctx);
    case "live":
      return { element: node.element, cleanups: node.cleanups ?? new Set() };
  }
}

function renderText(node: Extract<UIChild, { type: "text" }>, ctx: RenderContext): RenderResult {
  const cleanups = new Set<() => void>();
  const doc = ctx.doc;
  const span = doc.createElement("span");
  applyTextOpts(span, node.opts);

  if (isRef(node.content)) {
    const source = node.content as Ref<any>;
    const fmt = node.formatter ?? String;
    span.textContent = fmt(source.value);
    const unsub = source.subscribe((v) => {
      span.textContent = fmt(v);
    });
    cleanups.add(unsub);
  } else {
    span.textContent = node.content as string;
  }

  return { element: span, cleanups };
}

function renderBar(node: Extract<UIChild, { type: "bar" }>): RenderResult {
  const cleanups = new Set<() => void>();
  const opts = node.opts;

  const outer = document.createElement("div");
  outer.style.width = `${opts.width}px`;
  outer.style.height = `${opts.height}px`;
  outer.style.backgroundColor = opts.bgColor ?? "rgba(255,255,255,0.2)";
  if (opts.radius) outer.style.borderRadius = `${opts.radius}px`;
  outer.style.overflow = "hidden";

  const inner = document.createElement("div");
  inner.style.height = "100%";
  inner.style.transition = "width 0.15s ease";

  const updateBar = (ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    inner.style.width = `${clamped * 100}%`;
    if (typeof opts.color === "function") {
      inner.style.backgroundColor = opts.color(clamped);
    } else {
      inner.style.backgroundColor = opts.color ?? "#4caf50";
    }
  };

  if (node.source && node.formatter) {
    updateBar(node.formatter(node.source.value));
    const unsub = node.source.subscribe((v) => {
      updateBar(node.formatter!(v));
    });
    cleanups.add(unsub);
  } else {
    updateBar(0);
  }

  outer.appendChild(inner);
  return { element: outer, cleanups };
}

function renderHtml(node: Extract<UIChild, { type: "html" }>, ctx: RenderContext): RenderResult {
  const doc = ctx.doc;
  const el = doc.createElement("div");
  el.innerHTML = node.content;
  return { element: el, cleanups: new Set() };
}

function resolveBinding<T>(
  source: { kind: "ref"; ref: Ref<T> } | { kind: "feature"; key: string },
  ctx: RenderContext
): { ref: Ref<T>; cleanups: Set<() => void> } {
  const cleanups = new Set<() => void>();
  if (source.kind === "ref") {
    return { ref: source.ref, cleanups };
  }
  const key = source.key;
  const r = ref(ctx.features?.[key]) as Ref<T>;

  if (ctx.watchFeature) {
    const unsub = ctx.watchFeature(key, (v) => {
      r.value = v as T;
    });
    cleanups.add(unsub);
  }

  const unsub2 = r.subscribe((v) => {
    if (ctx.features) ctx.features[key] = v;
  });
  cleanups.add(unsub2);

  return { ref: r, cleanups };
}

function renderToggle(
  node: Extract<UIChild, { type: "toggle" }>,
  ctx: RenderContext
): RenderResult {
  const cleanups = new Set<() => void>();
  const { ref: bound, cleanups: bindCleanups } = resolveBinding<boolean>(node.source, ctx);
  bindCleanups.forEach((fn) => cleanups.add(fn));

  const doc = ctx.doc;
  const label = doc.createElement("label");
  label.style.display = "flex";
  label.style.alignItems = "center";
  label.style.gap = "6px";
  label.style.cursor = "pointer";

  const input = doc.createElement("input");
  input.type = "checkbox";
  input.checked = bound.value ?? false;

  const span = doc.createElement("span");
  span.textContent = node.label;

  input.addEventListener("change", () => {
    bound.value = input.checked;
  });
  const unsub = bound.subscribe((v) => {
    input.checked = v;
  });
  cleanups.add(unsub);

  label.appendChild(input);
  label.appendChild(span);
  return { element: label, cleanups };
}

function renderRange(node: Extract<UIChild, { type: "range" }>, ctx: RenderContext): RenderResult {
  const cleanups = new Set<() => void>();
  const { ref: bound, cleanups: bindCleanups } = resolveBinding<number>(node.source, ctx);
  bindCleanups.forEach((fn) => cleanups.add(fn));

  const doc = ctx.doc;
  const container = doc.createElement("div");
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.gap = "6px";

  const label = doc.createElement("span");
  label.textContent = node.label;

  const input = doc.createElement("input");
  input.type = "range";
  input.min = String(node.opts.min);
  input.max = String(node.opts.max);
  if (node.opts.step !== undefined) input.step = String(node.opts.step);
  input.value = String(bound.value ?? node.opts.min);

  const valueDisplay = doc.createElement("span");
  valueDisplay.style.minWidth = "40px";
  valueDisplay.style.textAlign = "right";
  valueDisplay.textContent = String(bound.value ?? node.opts.min);

  input.addEventListener("input", () => {
    bound.value = parseFloat(input.value);
  });

  const unsub = bound.subscribe((v) => {
    input.value = String(v);
    valueDisplay.textContent = String(v);
  });
  cleanups.add(unsub);

  container.appendChild(label);
  container.appendChild(input);
  container.appendChild(valueDisplay);
  return { element: container, cleanups };
}

function renderSelect(
  node: Extract<UIChild, { type: "select" }>,
  ctx: RenderContext
): RenderResult {
  const cleanups = new Set<() => void>();
  const { ref: bound, cleanups: bindCleanups } = resolveBinding<string>(node.source, ctx);
  bindCleanups.forEach((fn) => cleanups.add(fn));

  const doc = ctx.doc;
  const container = doc.createElement("div");
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.gap = "6px";

  const label = doc.createElement("span");
  label.textContent = node.label;

  const select = doc.createElement("select");
  for (const opt of node.options) {
    const option = doc.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  }
  select.value = bound.value ?? "";

  select.addEventListener("change", () => {
    bound.value = select.value;
  });
  const unsub = bound.subscribe((v) => {
    select.value = v;
  });
  cleanups.add(unsub);

  container.appendChild(label);
  container.appendChild(select);
  return { element: container, cleanups };
}

function renderButton(
  node: Extract<UIChild, { type: "button" }>,
  ctx: RenderContext
): RenderResult {
  const doc = ctx.doc;
  const btn = doc.createElement("button");
  btn.textContent = node.label;
  btn.addEventListener("click", node.onClick);
  return { element: btn, cleanups: new Set() };
}

function renderValue(node: Extract<UIChild, { type: "value" }>, ctx: RenderContext): RenderResult {
  const cleanups = new Set<() => void>();
  const doc = ctx.doc;
  const container = doc.createElement("div");
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.gap = "6px";

  const label = doc.createElement("span");
  label.textContent = node.label;

  const value = doc.createElement("span");
  if (isRef(node.content)) {
    value.textContent = node.content.value;
    const unsub = node.content.subscribe((v) => {
      value.textContent = v;
    });
    cleanups.add(unsub);
  } else {
    value.textContent = node.content;
  }

  container.appendChild(label);
  container.appendChild(value);
  return { element: container, cleanups };
}

function renderMenu(node: Extract<UIChild, { type: "menu" }>, ctx: RenderContext): RenderResult {
  const cleanups = new Set<() => void>();
  const { items, onSelect, focusIndex } = node;
  const doc = ctx.doc;

  const ul = doc.createElement("ul");
  ul.tabIndex = 0;
  ul.style.listStyle = "none";
  ul.style.margin = "0";
  ul.style.padding = "0";
  ul.style.outline = "none";

  const liElements: HTMLLIElement[] = items.map(() => {
    const li = doc.createElement("li");
    li.style.padding = "2px 4px";
    return li;
  });

  items.forEach((item, i) => {
    const li = liElements[i];
    li.style.cursor = item.disabled ? "default" : "pointer";
    if (item.disabled) li.style.opacity = "0.4";
  });

  const updateHighlight = (idx: number) => {
    liElements.forEach((li, i) => {
      const item = items[i];
      const cursor = i === idx ? "> " : "  ";
      li.textContent = cursor + item.label;
      li.style.backgroundColor = i === idx ? "rgba(255,255,255,0.15)" : "";
      li.style.color = i === idx && !item.disabled ? "#fff" : "";
    });
  };

  const abortCtrl = new AbortController();
  const signal = abortCtrl.signal;

  liElements.forEach((li, i) => {
    li.addEventListener(
      "click",
      () => {
        if (items[i].disabled) return;
        focusIndex.value = i;
        onSelect(items[i]);
      },
      { signal }
    );
    ul.appendChild(li);
  });

  updateHighlight(focusIndex.value);
  const unsub = focusIndex.subscribe((idx) => updateHighlight(idx));
  cleanups.add(unsub);

  ul.addEventListener(
    "keydown",
    (e) => {
      const count = items.length;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        let next = (focusIndex.value + 1) % count;
        while (items[next].disabled && next !== focusIndex.value) next = (next + 1) % count;
        focusIndex.value = next;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        let prev = (focusIndex.value - 1 + count) % count;
        while (items[prev].disabled && prev !== focusIndex.value) prev = (prev - 1 + count) % count;
        focusIndex.value = prev;
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const focused = items[focusIndex.value];
        if (!focused.disabled) onSelect(focused);
      }
    },
    { signal }
  );

  cleanups.add(() => abortCtrl.abort());
  return { element: ul, cleanups };
}

function renderList(node: Extract<UIChild, { type: "list" }>, ctx: RenderContext): RenderResult {
  const cleanups = new Set<() => void>();
  const doc = ctx.doc;

  const container = doc.createElement("div");
  container.style.overflowY = "auto";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "4px";

  for (const child of node.children) {
    const result = renderNode(child, ctx);
    container.appendChild(result.element);
    result.cleanups.forEach((fn) => cleanups.add(fn));
  }

  return { element: container, cleanups };
}

function renderSplit(node: Extract<UIChild, { type: "split" }>, ctx: RenderContext): RenderResult {
  const cleanups = new Set<() => void>();
  const opts = node.opts;
  const isRow = opts.direction === "row";
  const doc = ctx.doc;

  const container = doc.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = isRow ? "row" : "column";
  container.style.flex = "1";
  container.style.minWidth = "0";
  container.style.minHeight = "0";
  container.style.overflow = "hidden";
  container.style.width = "100%";
  container.style.height = "100%";

  const slotEls: HTMLElement[] = [];

  const applySizes = (): void => {
    const sizes = opts.sizes.value;
    const total = sizes.reduce((a, b) => a + b, 0) || 1;
    slotEls.forEach((el, i) => {
      const w = sizes[i] ?? 1;
      el.style.flexGrow = String(w / total);
      el.style.flexShrink = "1";
      el.style.flexBasis = "0";
      el.style.minWidth = "0";
      el.style.minHeight = "0";
    });
  };

  for (let i = 0; i < opts.slots.length; i++) {
    if (i > 0) {
      const handle = doc.createElement("div");
      handle.style.flex = "0 0 auto";
      handle.style.background = "rgba(255,255,255,0.06)";
      handle.style.cursor = isRow ? "ew-resize" : "ns-resize";
      if (isRow) {
        handle.style.width = "5px";
        handle.style.alignSelf = "stretch";
      } else {
        handle.style.height = "5px";
        handle.style.alignSelf = "stretch";
      }
      handle.addEventListener("mouseenter", () => {
        handle.style.background = "rgba(255,255,255,0.18)";
      });
      handle.addEventListener("mouseleave", () => {
        handle.style.background = "rgba(255,255,255,0.06)";
      });

      const splitIdx = i - 1;
      handle.addEventListener("mousedown", (downEv) => {
        downEv.preventDefault();
        const start = isRow ? downEv.clientX : downEv.clientY;
        const startA = opts.sizes.value[splitIdx];
        const startB = opts.sizes.value[splitIdx + 1];
        const sumPx = isRow
          ? slotEls[splitIdx].getBoundingClientRect().width +
            slotEls[splitIdx + 1].getBoundingClientRect().width
          : slotEls[splitIdx].getBoundingClientRect().height +
            slotEls[splitIdx + 1].getBoundingClientRect().height;
        const sumWeight = startA + startB || 1;

        const onMove = (moveEv: MouseEvent) => {
          const cur = isRow ? moveEv.clientX : moveEv.clientY;
          const dPx = cur - start;
          const dWeight = (dPx / Math.max(1, sumPx)) * sumWeight;
          const nextA = Math.max(0.05, startA + dWeight);
          const nextB = Math.max(0.05, startB - dWeight);
          const next = [...opts.sizes.value];
          next[splitIdx] = nextA;
          next[splitIdx + 1] = nextB;
          opts.sizes.value = next;
        };
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        document.body.style.cursor = isRow ? "ew-resize" : "ns-resize";
        document.body.style.userSelect = "none";
      });

      container.appendChild(handle);
    }

    const slotEl = doc.createElement("div");
    slotEl.style.display = "flex";
    slotEl.style.minWidth = "0";
    slotEl.style.minHeight = "0";
    slotEl.style.overflow = "hidden";
    container.appendChild(slotEl);
    slotEls.push(slotEl);

    const slotResult = renderUI(opts.slots[i], ctx);
    slotResult.element.style.flex = "1";
    slotResult.element.style.minWidth = "0";
    slotResult.element.style.minHeight = "0";
    slotEl.appendChild(slotResult.element);
    slotResult.cleanups.forEach((fn) => cleanups.add(fn));
  }

  applySizes();
  const unsub = opts.sizes.subscribe(() => applySizes());
  cleanups.add(unsub);

  return { element: container, cleanups };
}

/**
 * Fine-grained reactive `Tabs`: each tab body is rendered on first visit and
 * cached by `tab.id`. Switching tabs detaches the previous body (DOM + ref
 * subscriptions survive) and attaches the target — cached if seen before,
 * freshly rendered otherwise. Tabs dropped from the list have their cached
 * body torn down. Adding tabs is lazy — their bodies aren't rendered until
 * selected.
 */
function renderTabs(node: Extract<UIChild, { type: "tabs" }>, ctx: RenderContext): RenderResult {
  const cleanups = new Set<() => void>();
  const opts = node.opts;
  const doc = ctx.doc;

  const wrap = doc.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.flex = "1";
  wrap.style.minHeight = "0";
  wrap.style.overflow = "hidden";
  if (opts.dataAttrs) {
    for (const [key, value] of Object.entries(opts.dataAttrs)) {
      wrap.dataset[key] = value;
    }
  }

  const strip = doc.createElement("div");
  strip.style.display = "flex";
  strip.style.flexDirection = "row";
  strip.style.flexShrink = "0";
  strip.style.borderBottom = "1px solid rgba(255,255,255,0.08)";
  strip.style.background = "rgba(255,255,255,0.03)";
  strip.style.overflowX = "auto";
  strip.style.minHeight = "26px";

  const body = doc.createElement("div");
  body.style.flex = "1";
  body.style.minHeight = "0";
  body.style.overflow = "auto";

  wrap.appendChild(strip);
  wrap.appendChild(body);

  type Slot = { element: HTMLElement; cleanups: Set<() => void> };
  const bodyCache = new Map<string, Slot>();
  let currentId: string | null = null;

  const detachCurrent = (): void => {
    if (currentId === null) return;
    const prev = bodyCache.get(currentId);
    if (prev && prev.element.parentNode === body) body.removeChild(prev.element);
    currentId = null;
  };

  const renderActiveBody = () => {
    const tabs = opts.tabs.value;
    const idx = Math.max(0, Math.min(opts.active.value, tabs.length - 1));
    const active = tabs[idx];
    if (!active) {
      detachCurrent();
      return;
    }
    if (active.id === currentId) return;

    detachCurrent();

    let slot = bodyCache.get(active.id);
    if (!slot) {
      const r = renderUI(active.body, ctx);
      slot = { element: r.element, cleanups: r.cleanups };
      bodyCache.set(active.id, slot);
    }
    body.appendChild(slot.element);
    currentId = active.id;
  };

  const pruneStaleCache = (): void => {
    const liveIds = new Set(opts.tabs.value.map((t) => t.id));
    for (const [id, slot] of bodyCache) {
      if (liveIds.has(id)) continue;
      slot.cleanups.forEach((fn) => fn());
      if (slot.element.parentNode) slot.element.parentNode.removeChild(slot.element);
      bodyCache.delete(id);
      if (id === currentId) currentId = null;
    }
  };

  const renderStrip = () => {
    while (strip.firstChild) strip.removeChild(strip.firstChild);
    const tabs = opts.tabs.value;
    const activeIdx = opts.active.value;
    tabs.forEach((tab, i) => {
      const btn = doc.createElement("button");
      btn.type = "button";
      btn.textContent = tab.title;
      const isActive = i === activeIdx;
      btn.style.background = isActive ? "rgba(255,255,255,0.06)" : "transparent";
      btn.style.color = isActive ? "inherit" : "rgba(255,255,255,0.6)";
      btn.style.border = "none";
      btn.style.borderRight = "1px solid rgba(255,255,255,0.06)";
      btn.style.borderBottom = isActive ? "2px solid currentColor" : "2px solid transparent";
      btn.style.padding = "5px 12px";
      btn.style.cursor = "pointer";
      btn.style.fontFamily = "inherit";
      btn.style.fontSize = "inherit";
      btn.style.flexShrink = "0";
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
  renderActiveBody();
  cleanups.add(
    opts.tabs.subscribe(() => {
      pruneStaleCache();
      renderStrip();
      renderActiveBody();
    })
  );
  cleanups.add(
    opts.active.subscribe(() => {
      renderStrip();
      renderActiveBody();
    })
  );
  cleanups.add(() => {
    for (const slot of bodyCache.values()) slot.cleanups.forEach((fn) => fn());
    bodyCache.clear();
    currentId = null;
  });

  return { element: wrap, cleanups };
}

/**
 * Key-based diffing reconciler for `For`. Implements the fine-grained
 * invariant that items with unchanged keys keep their DOM nodes + internal
 * subscriptions. Adding a single element to a 100-item list does ~1 DOM
 * insertion, not 100 rebuilds.
 *
 * Duplicate keys in one batch each get a fresh slot (logged once) — we
 * don't want to silently merge distinct items under the same key.
 */
function renderFor(node: Extract<UIChild, { type: "for" }>, ctx: RenderContext): RenderResult {
  const cleanups = new Set<() => void>();
  const opts = node.opts;
  const doc = ctx.doc;

  const wrap = doc.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";

  type Slot = { key: unknown; element: HTMLElement; cleanups: Set<() => void> };
  let slots: Slot[] = [];
  let emptySlot: Slot | null = null;

  const keyOf = opts.key ?? ((item: unknown) => item);

  const teardown = (slot: Slot): void => {
    slot.cleanups.forEach((fn) => fn());
    if (slot.element.parentNode) slot.element.parentNode.removeChild(slot.element);
  };

  const renderItem = (item: unknown, idx: number, key: unknown): Slot => {
    const desc = opts.render(item as never, idx);
    const r = renderUI(desc, ctx);
    return { key, element: r.element, cleanups: r.cleanups };
  };

  const showEmpty = (): void => {
    if (!opts.empty || emptySlot) return;
    const r = renderUI(opts.empty, ctx);
    emptySlot = { key: undefined, element: r.element, cleanups: r.cleanups };
    wrap.appendChild(r.element);
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

    const nextSlots: Slot[] = new Array(items.length);
    const claimed = new Set<unknown>();

    for (let i = 0; i < items.length; i++) {
      const key = keyOf(items[i] as never, i);
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
      nextSlots[i] = slot;
    }

    // Destroy leftover slots that didn't survive.
    for (const stale of prevByKey.values()) teardown(stale);

    // Reorder DOM so nextSlots[i] sits right before nextSlots[i+1].element.
    // Walk back-to-front so the reference node is already positioned.
    for (let i = nextSlots.length - 1; i >= 0; i--) {
      const cur = nextSlots[i];
      const ref = nextSlots[i + 1]?.element ?? null;
      if (cur.element.parentNode !== wrap || cur.element.nextSibling !== ref) {
        wrap.insertBefore(cur.element, ref);
      }
    }

    slots = nextSlots;
  };

  diff();
  cleanups.add(opts.items.subscribe(() => diff()));
  cleanups.add(() => {
    for (const s of slots) s.cleanups.forEach((fn) => fn());
    slots = [];
    if (emptySlot) emptySlot.cleanups.forEach((fn) => fn());
    emptySlot = null;
  });

  return { element: wrap, cleanups };
}

/**
 * Fine-grained reactive `Show`: body and fallback are each rendered at most
 * once per mount. Flipping `when` back and forth detaches / reattaches the
 * cached element — internal ref subscriptions, DOM state, and cleanups all
 * survive the round trip. Teardown runs once at the enclosing scope unmount.
 */
function renderShow(node: Extract<UIChild, { type: "show" }>, ctx: RenderContext): RenderResult {
  const cleanups = new Set<() => void>();
  const opts = node.opts;
  const doc = ctx.doc;

  const wrap = doc.createElement("div");
  wrap.style.display = "contents";

  type Slot = { element: HTMLElement; cleanups: Set<() => void> };
  let bodySlot: Slot | null = null;
  let fallbackSlot: Slot | null = null;
  let current: "body" | "fallback" | null = null;

  const ensureBody = (): Slot => {
    if (!bodySlot) {
      const r = renderUI(opts.body, ctx);
      bodySlot = { element: r.element, cleanups: r.cleanups };
    }
    return bodySlot;
  };
  const ensureFallback = (): Slot | null => {
    if (!opts.fallback) return null;
    if (!fallbackSlot) {
      const r = renderUI(opts.fallback, ctx);
      fallbackSlot = { element: r.element, cleanups: r.cleanups };
    }
    return fallbackSlot;
  };

  const sync = () => {
    const targetKind: "body" | "fallback" = opts.when.value ? "body" : "fallback";
    if (targetKind === current) return;

    const prev = current === "body" ? bodySlot : current === "fallback" ? fallbackSlot : null;
    if (prev && prev.element.parentNode === wrap) {
      wrap.removeChild(prev.element);
    }

    const next = targetKind === "body" ? ensureBody() : ensureFallback();
    if (next) wrap.appendChild(next.element);
    current = targetKind;
  };

  sync();
  cleanups.add(opts.when.subscribe(() => sync()));
  cleanups.add(() => {
    bodySlot?.cleanups.forEach((fn) => fn());
    fallbackSlot?.cleanups.forEach((fn) => fn());
    bodySlot = null;
    fallbackSlot = null;
    current = null;
  });

  return { element: wrap, cleanups };
}

function renderFloating(
  node: Extract<UIChild, { type: "floating" }>,
  ctx: RenderContext
): RenderResult {
  const cleanups = new Set<() => void>();
  const opts = node.opts;
  const doc = ctx.doc;
  const closeOnOutside = opts.closeOnOutside ?? true;
  const closeOnEsc = opts.closeOnEsc ?? true;

  const wrap = doc.createElement("div");
  wrap.style.display = "contents";

  const floater = doc.createElement("div");
  floater.style.position = "fixed";
  floater.style.zIndex = "2147483647";
  floater.style.display = "none";

  const setNumeric = (
    key: "left" | "top" | "width" | "height",
    v: number | Ref<number> | undefined
  ) => {
    if (v == null) return;
    if (isRef(v)) {
      const r = v;
      const apply = (n: number) => {
        floater.style[key] = `${n}px`;
      };
      apply(r.value);
      const unsub = r.subscribe((n: number) => apply(n));
      cleanups.add(unsub);
    } else {
      floater.style[key] = `${v}px`;
    }
  };
  setNumeric("left", opts.x);
  setNumeric("top", opts.y);
  setNumeric("width", opts.width);
  setNumeric("height", opts.height);

  let mounted: { cleanups: Set<() => void> } | null = null;
  const mount = () => {
    if (mounted) return;
    const r = renderUI(opts.body, ctx);
    floater.appendChild(r.element);
    doc.body.appendChild(floater);
    floater.style.display = "block";
    mounted = { cleanups: r.cleanups };
  };
  const unmount = () => {
    if (!mounted) return;
    floater.style.display = "none";
    while (floater.firstChild) floater.removeChild(floater.firstChild);
    floater.remove();
    mounted.cleanups.forEach((fn) => fn());
    mounted = null;
  };

  const sync = () => {
    if (opts.visible.value) mount();
    else unmount();
  };

  let docHandlersInstalled = false;
  const onDocMouseDown = (ev: MouseEvent) => {
    if (!floater.contains(ev.target as Node)) opts.visible.value = false;
  };
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") opts.visible.value = false;
  };
  const installDocHandlers = () => {
    if (docHandlersInstalled) return;
    docHandlersInstalled = true;
    // Deferred so an opener click doesn't immediately close the floater.
    setTimeout(() => {
      if (closeOnOutside) doc.addEventListener("mousedown", onDocMouseDown);
      if (closeOnEsc) doc.addEventListener("keydown", onKey);
    }, 0);
  };
  const removeDocHandlers = () => {
    if (!docHandlersInstalled) return;
    docHandlersInstalled = false;
    if (closeOnOutside) doc.removeEventListener("mousedown", onDocMouseDown);
    if (closeOnEsc) doc.removeEventListener("keydown", onKey);
  };

  cleanups.add(
    opts.visible.subscribe((v) => {
      sync();
      if (v) installDocHandlers();
      else removeDocHandlers();
    })
  );
  cleanups.add(() => {
    removeDocHandlers();
    unmount();
  });

  sync();
  if (opts.visible.value) installDocHandlers();

  return { element: wrap, cleanups };
}

function applyTextOpts(el: HTMLElement, opts?: TextOpts): void {
  if (!opts) return;
  if (opts.size) el.style.fontSize = `${opts.size}px`;
  if (opts.color) el.style.color = opts.color;
  if (opts.bold) el.style.fontWeight = "bold";
  if (opts.align) el.style.textAlign = opts.align;
}
