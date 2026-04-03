import type { Application } from "@dalpeng/core";
import { isRef, ref, type Ref } from "../reactive";
import type { NodeDescriptor, UITemplate, TextOpts } from "./types";

export interface RenderResult {
  element: HTMLElement;
  cleanups: Set<() => void>;
}

/**
 * Renders a UITemplate into DOM. Returns the root element and all cleanup functions.
 */
export function renderTemplate(template: UITemplate, app?: Application): RenderResult {
  const cleanups = new Set<() => void>();
  const nodes = template._setup();

  // Collect cleanups from setup scope
  const setupCleanups = (template as any)._cleanups as Set<() => void> | undefined;
  if (setupCleanups) {
    setupCleanups.forEach((fn) => cleanups.add(fn));
  }

  const container = document.createElement("div");
  const layout = template._layout ?? { direction: "column", gap: 4 };
  container.style.display = "flex";
  container.style.flexDirection = layout.direction;
  container.style.gap = `${layout.gap}px`;
  if (layout.align) container.style.alignItems = layout.align;

  for (const node of nodes) {
    const result = renderNode(node, app);
    container.appendChild(result.element);
    result.cleanups.forEach((fn) => cleanups.add(fn));
  }

  return { element: container, cleanups };
}

/**
 * Renders a single NodeDescriptor into DOM.
 */
function renderNode(node: NodeDescriptor, app?: Application): RenderResult {
  switch (node.type) {
    case "text": return renderText(node);
    case "bar": return renderBar(node);
    case "html": return renderHtml(node);
    case "toggle": return renderToggle(node, app);
    case "range": return renderRange(node, app);
    case "select": return renderSelect(node, app);
    case "button": return renderButton(node);
    case "value": return renderValue(node);
    case "ui": return renderTemplate(node.template, app);
  }
}

// ─── Display Atoms ────────────────────────────────────────────────────────

function renderText(node: Extract<NodeDescriptor, { type: "text" }>): RenderResult {
  const cleanups = new Set<() => void>();
  const span = document.createElement("span");
  applyTextOpts(span, node.opts);

  if (isRef(node.content)) {
    const source = node.content as Ref<any>;
    const fmt = node.formatter ?? String;
    span.textContent = fmt(source.value);
    const unsub = source.subscribe((v) => { span.textContent = fmt(v); });
    cleanups.add(unsub);
  } else {
    span.textContent = node.content as string;
  }

  return { element: span, cleanups };
}

function renderBar(node: Extract<NodeDescriptor, { type: "bar" }>): RenderResult {
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
    const unsub = node.source.subscribe((v) => { updateBar(node.formatter!(v)); });
    cleanups.add(unsub);
  } else {
    updateBar(0);
  }

  outer.appendChild(inner);
  return { element: outer, cleanups };
}

function renderHtml(node: Extract<NodeDescriptor, { type: "html" }>): RenderResult {
  const el = document.createElement("div");
  el.innerHTML = node.content;
  return { element: el, cleanups: new Set() };
}

// ─── Interactive Atoms ──────────────────────────────────────────────────────

function resolveBinding<T>(source: { kind: "ref"; ref: Ref<T> } | { kind: "feature"; key: string }, app?: Application): { ref: Ref<T>; cleanups: Set<() => void> } {
  const cleanups = new Set<() => void>();
  if (source.kind === "ref") {
    return { ref: source.ref, cleanups };
  }
  // Feature key → create a two-way bound Ref
  const key = source.key;
  const r = ref((app?.features as any)?.[key]) as Ref<T>;

  // Feature → Ref sync
  if (app?.watchFeature) {
    const unsub = app.watchFeature(key, (v) => { r.value = v as T; });
    cleanups.add(unsub);
  }

  // Ref → Feature sync
  const unsub2 = r.subscribe((v) => {
    if (app) (app.features as any)[key] = v;
  });
  cleanups.add(unsub2);

  return { ref: r, cleanups };
}

function renderToggle(node: Extract<NodeDescriptor, { type: "toggle" }>, app?: Application): RenderResult {
  const cleanups = new Set<() => void>();
  const { ref: bound, cleanups: bindCleanups } = resolveBinding<boolean>(node.source, app);
  bindCleanups.forEach((fn) => cleanups.add(fn));

  const label = document.createElement("label");
  label.style.display = "flex";
  label.style.alignItems = "center";
  label.style.gap = "6px";
  label.style.cursor = "pointer";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = bound.value ?? false;

  const span = document.createElement("span");
  span.textContent = node.label;

  input.addEventListener("change", () => { bound.value = input.checked; });
  const unsub = bound.subscribe((v) => { input.checked = v; });
  cleanups.add(unsub);

  label.appendChild(input);
  label.appendChild(span);
  return { element: label, cleanups };
}

function renderRange(node: Extract<NodeDescriptor, { type: "range" }>, app?: Application): RenderResult {
  const cleanups = new Set<() => void>();
  const { ref: bound, cleanups: bindCleanups } = resolveBinding<number>(node.source, app);
  bindCleanups.forEach((fn) => cleanups.add(fn));

  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.gap = "6px";

  const label = document.createElement("span");
  label.textContent = node.label;

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(node.opts.min);
  input.max = String(node.opts.max);
  if (node.opts.step !== undefined) input.step = String(node.opts.step);
  input.value = String(bound.value ?? node.opts.min);

  const valueDisplay = document.createElement("span");
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

function renderSelect(node: Extract<NodeDescriptor, { type: "select" }>, app?: Application): RenderResult {
  const cleanups = new Set<() => void>();
  const { ref: bound, cleanups: bindCleanups } = resolveBinding<string>(node.source, app);
  bindCleanups.forEach((fn) => cleanups.add(fn));

  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.gap = "6px";

  const label = document.createElement("span");
  label.textContent = node.label;

  const select = document.createElement("select");
  for (const opt of node.options) {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  }
  select.value = bound.value ?? "";

  select.addEventListener("change", () => { bound.value = select.value; });
  const unsub = bound.subscribe((v) => { select.value = v; });
  cleanups.add(unsub);

  container.appendChild(label);
  container.appendChild(select);
  return { element: container, cleanups };
}

function renderButton(node: Extract<NodeDescriptor, { type: "button" }>): RenderResult {
  const btn = document.createElement("button");
  btn.textContent = node.label;
  btn.addEventListener("click", node.onClick);
  return { element: btn, cleanups: new Set() };
}

function renderValue(node: Extract<NodeDescriptor, { type: "value" }>): RenderResult {
  const cleanups = new Set<() => void>();
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.gap = "6px";

  const label = document.createElement("span");
  label.textContent = node.label;

  const value = document.createElement("span");
  if (isRef(node.content)) {
    value.textContent = node.content.value;
    const unsub = node.content.subscribe((v) => { value.textContent = v; });
    cleanups.add(unsub);
  } else {
    value.textContent = node.content;
  }

  container.appendChild(label);
  container.appendChild(value);
  return { element: container, cleanups };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function applyTextOpts(el: HTMLElement, opts?: TextOpts): void {
  if (!opts) return;
  if (opts.size) el.style.fontSize = `${opts.size}px`;
  if (opts.color) el.style.color = opts.color;
  if (opts.bold) el.style.fontWeight = "bold";
  if (opts.align) el.style.textAlign = opts.align;
}
