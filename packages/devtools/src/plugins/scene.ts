import { ref, watch, type Component, type GameEntity } from "@dalpeng/core";
import { adopt, defineUI } from "@dalpeng/ui";
import { componentDisplayName, getComponentSchema, type FieldSchema } from "../editSchema";
import type { DevToolsHost } from "../host";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

const MODIFIED_COLOR = "#f59e0b";
const ROW_HOVER_COLOR = "rgba(255,255,255,0.04)";
const ROW_SELECTED_COLOR = "rgba(123,224,161,0.15)";
const AXIS_X_COLOR = "#ff6b6b";
const AXIS_Y_COLOR = "#51cf66";
const AXIS_Z_COLOR = "#4dabf7";

function entityLabel(e: GameEntity): string {
  const name = e.name || `<#${e.id}>`;
  const parts: string[] = [name];
  if (e.tag && e.tag !== "default") parts.push(`[${e.tag}]`);
  if (e._layerName) parts.push(`<${e._layerName}>`);
  return parts.join(" ");
}

function matchesFilter(entity: GameEntity, filter: string): boolean {
  if (!filter) return true;
  const q = filter.toLowerCase();
  if (entity.name.toLowerCase().includes(q)) return true;
  if (entity.tag.toLowerCase().includes(q)) return true;
  if (entity._layerName?.toLowerCase().includes(q)) return true;
  return entity.children.some((c) => matchesFilter(c, filter));
}

function buildTreePanel(host: DevToolsHost, selected: ReturnType<typeof ref<GameEntity | null>>) {
  const root = document.createElement("div");
  root.style.cssText = "display:flex;flex-direction:column;height:100%;min-height:0";

  const filterBar = document.createElement("div");
  filterBar.style.cssText =
    "padding:4px 6px;border-bottom:1px solid var(--ui-color-neutral-border)";
  const filterInput = document.createElement("input");
  filterInput.type = "text";
  filterInput.placeholder = "🔍 filter entities…";
  filterInput.style.cssText =
    "width:100%;background:var(--ui-color-surface-low);color:var(--ui-color-text-primary);border:1px solid var(--ui-color-neutral-border);border-radius:3px;padding:3px 6px;font:inherit;outline:none;box-sizing:border-box";
  filterBar.appendChild(filterInput);

  const listContainer = document.createElement("div");
  listContainer.tabIndex = 0;
  listContainer.style.cssText =
    "flex:1;overflow:auto;padding:2px 0;font-size:11px;line-height:1.5;outline:none";

  root.appendChild(filterBar);
  root.appendChild(listContainer);

  /** Walk the tree in render order, skipping children of collapsed or filter-excluded parents. */
  function visibleEntities(): GameEntity[] {
    const out: GameEntity[] = [];
    const entities = host.entities.value;
    const roots = entities.filter((e) => !e.parent && matchesFilter(e, filter));
    const walk = (e: GameEntity): void => {
      out.push(e);
      if (collapsed.has(e.id)) return;
      for (const c of e.children) if (matchesFilter(c, filter)) walk(c);
    };
    for (const r of roots) walk(r);
    return out;
  }

  listContainer.addEventListener("keydown", (ev) => {
    if (ev.target !== listContainer) return;
    const visible = visibleEntities();
    if (visible.length === 0) return;
    const idx = selected.value ? visible.indexOf(selected.value) : -1;

    switch (ev.key) {
      case "ArrowDown": {
        ev.preventDefault();
        const next = visible[Math.min(visible.length - 1, idx + 1)] ?? visible[0];
        pendingScrollToSelected = true;
        selected.value = next;
        host.emit("entitySelected", { entity: next });
        break;
      }
      case "ArrowUp": {
        ev.preventDefault();
        const prev = visible[Math.max(0, idx - 1)] ?? visible[0];
        pendingScrollToSelected = true;
        selected.value = prev;
        host.emit("entitySelected", { entity: prev });
        break;
      }
      case "ArrowRight": {
        if (!selected.value) break;
        ev.preventDefault();
        const e = selected.value;
        if (e.children.length > 0 && collapsed.has(e.id)) {
          collapsed.delete(e.id);
          render();
        }
        break;
      }
      case "ArrowLeft": {
        if (!selected.value) break;
        ev.preventDefault();
        const e = selected.value;
        if (e.children.length > 0 && !collapsed.has(e.id)) {
          collapsed.add(e.id);
          render();
        } else if (e.parent) {
          pendingScrollToSelected = true;
          selected.value = e.parent;
          host.emit("entitySelected", { entity: e.parent });
        }
        break;
      }
    }
  });

  const collapsed = new Set<number>();
  let filter = "";
  let pendingScrollToSelected = false;
  // Set by the input handler, consumed once by render() to scroll the first
  // direct-match row into view. Typing 'p' then 'l' then 'a' shouldn't yank
  // scroll back and forth uncontrollably — only the first match for the
  // current filter string is targeted.
  let pendingScrollToFirstMatch = false;

  filterInput.addEventListener("input", () => {
    filter = filterInput.value.trim();
    pendingScrollToFirstMatch = filter.length > 0;
    render();
  });

  function renderRow(entity: GameEntity, depth: number): HTMLElement {
    const wrap = document.createElement("div");
    const row = document.createElement("div");
    const isCollapsed = collapsed.has(entity.id);
    const hasChildren = entity.children.length > 0;
    const isSelected = selected.value === entity;
    const directMatch =
      filter.length > 0 && entity.name.toLowerCase().includes(filter.toLowerCase());
    if (directMatch) row.dataset.directMatch = "1";

    row.style.cssText = `display:flex;align-items:center;padding:1px 4px 1px ${depth * 12 + 4}px;cursor:pointer;white-space:nowrap;color:${isSelected ? "var(--ui-color-primary-text)" : "var(--ui-color-text-primary)"};background:${isSelected ? ROW_SELECTED_COLOR : "transparent"}`;
    if (isSelected) row.dataset.selectedRow = "1";

    const twisty = document.createElement("span");
    twisty.textContent = hasChildren ? (isCollapsed ? "▶" : "▼") : " ";
    twisty.style.cssText = `display:inline-block;width:10px;color:var(--ui-color-text-muted);font-size:8px;margin-right:2px`;
    if (hasChildren) {
      twisty.style.cursor = "pointer";
      twisty.addEventListener("click", (e) => {
        e.stopPropagation();
        if (collapsed.has(entity.id)) collapsed.delete(entity.id);
        else collapsed.add(entity.id);
        render();
      });
    }
    row.appendChild(twisty);

    const label = document.createElement("span");
    label.textContent = entityLabel(entity);
    row.appendChild(label);

    row.addEventListener("click", () => {
      selected.value = entity;
      host.emit("entitySelected", { entity });
    });
    row.addEventListener("mouseenter", () => {
      if (!isSelected) row.style.background = ROW_HOVER_COLOR;
    });
    row.addEventListener("mouseleave", () => {
      if (!isSelected) row.style.background = "transparent";
    });

    wrap.appendChild(row);
    if (hasChildren && !isCollapsed) {
      for (const child of entity.children) {
        if (matchesFilter(child, filter)) {
          wrap.appendChild(renderRow(child, depth + 1));
        }
      }
    }
    return wrap;
  }

  function render(): void {
    const savedScroll = listContainer.scrollTop;
    const entities = host.entities.value;
    listContainer.innerHTML = "";
    if (entities.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "no entities";
      empty.style.cssText = `padding:8px;color:var(--ui-color-text-muted)`;
      listContainer.appendChild(empty);
      return;
    }
    const roots = entities.filter((e) => !e.parent && matchesFilter(e, filter));
    for (const r of roots) {
      listContainer.appendChild(renderRow(r, 0));
    }
    listContainer.scrollTop = savedScroll;

    if (pendingScrollToFirstMatch) {
      pendingScrollToFirstMatch = false;
      const firstMatch = listContainer.querySelector<HTMLElement>('[data-direct-match="1"]');
      firstMatch?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    if (pendingScrollToSelected) {
      pendingScrollToSelected = false;
      const sel = listContainer.querySelector<HTMLElement>('[data-selected-row="1"]');
      sel?.scrollIntoView({ block: "nearest" });
    }
  }

  return { root, render };
}

// ── Editor components ──────────────────────────────────────────────

interface FieldBinding {
  schema: FieldSchema;
  /** Live current value from the component. */
  getValue(): unknown;
  /** Write new value; the host records a patch. */
  setValue(v: unknown): void;
  /** Whether this field currently has a patch. */
  isPatched(): boolean;
}

/** Editor returns its DOM element + a refresh tick. */
interface Editor {
  element: HTMLElement;
  tick(): void;
}

function makeCopyButton(getText: () => string): HTMLElement {
  const btn = document.createElement("button");
  btn.textContent = "📋";
  btn.style.cssText =
    "background:none;border:none;color:var(--ui-color-text-secondary);cursor:pointer;font-size:10px;padding:0 4px;margin-left:4px;opacity:0.5";
  btn.addEventListener("mouseenter", () => {
    btn.style.opacity = "1";
    btn.title = `Copy: ${getText()}`;
  });
  btn.addEventListener("mouseleave", () => (btn.style.opacity = "0.5"));
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getText());
      btn.textContent = "✓";
      setTimeout(() => (btn.textContent = "📋"), 800);
    } catch {
      btn.textContent = "✗";
      setTimeout(() => (btn.textContent = "📋"), 800);
    }
  });
  return btn;
}

function formatNumber(v: number): string {
  if (!Number.isFinite(v)) return "0";
  return Math.abs(v) < 0.0001 && v !== 0 ? v.toExponential(2) : v.toFixed(3).replace(/\.?0+$/, "");
}

function makeNumberDrag(
  binding: FieldBinding,
  getValue: () => number,
  setValue: (v: number) => void,
  label?: string,
  color?: string
): Editor {
  const wrap = document.createElement("span");
  wrap.style.cssText = "display:inline-flex;align-items:center;margin-right:6px";

  if (label) {
    const lbl = document.createElement("span");
    lbl.textContent = label;
    lbl.style.cssText = `color:${color ?? "var(--ui-color-text-muted)"};margin-right:3px;font-weight:600;user-select:none`;
    wrap.appendChild(lbl);
  }

  const input = document.createElement("input");
  input.type = "text";
  input.style.cssText = `width:58px;background:var(--ui-color-surface-low);color:var(--ui-color-text-primary);border:1px solid var(--ui-color-neutral-border);border-radius:2px;padding:1px 4px;font:inherit;font-size:10px;outline:none;text-align:right;cursor:ew-resize`;
  input.value = formatNumber(getValue());

  const step = binding.schema.step ?? 0.1;
  const clamp = (v: number) =>
    Math.max(binding.schema.min ?? -Infinity, Math.min(binding.schema.max ?? Infinity, v));

  let isDragging = false;
  let dragStart = 0;
  let dragBaseline = 0;

  input.addEventListener("pointerdown", (e) => {
    if (document.activeElement === input) return;
    e.preventDefault();
    isDragging = true;
    dragStart = e.clientX;
    dragBaseline = getValue();
    input.setPointerCapture(e.pointerId);
  });

  input.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart;
    const mult = e.shiftKey ? 10 : 1;
    const next = clamp(dragBaseline + dx * step * mult);
    setValue(next);
    input.value = formatNumber(next);
  });

  const endDrag = (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    if (input.hasPointerCapture(e.pointerId)) input.releasePointerCapture(e.pointerId);
    if (e.clientX === dragStart) {
      input.focus();
      input.select();
    }
  };
  input.addEventListener("pointerup", endDrag);
  input.addEventListener("pointercancel", endDrag);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const v = parseFloat(input.value);
      if (Number.isFinite(v)) setValue(clamp(v));
      input.blur();
    } else if (e.key === "Escape") {
      input.value = formatNumber(getValue());
      input.blur();
    }
  });

  wrap.appendChild(input);

  return {
    element: wrap,
    tick() {
      if (document.activeElement === input || isDragging) return;
      input.value = formatNumber(getValue());
      input.style.color = binding.isPatched() ? MODIFIED_COLOR : "var(--ui-color-text-primary)";
    },
  };
}

function makeFieldEditor(binding: FieldBinding, host: DevToolsHost): Editor {
  const schema = binding.schema;
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;align-items:center;padding:1px 0 1px 12px";

  const label = document.createElement("span");
  label.textContent = schema.label ?? "";
  label.style.cssText = `color:var(--ui-color-text-secondary);min-width:90px;font-size:10px`;
  wrap.appendChild(label);

  const valueWrap = document.createElement("span");
  valueWrap.style.cssText = "flex:1;display:flex;align-items:center;min-width:0";
  wrap.appendChild(valueWrap);

  const refreshers: (() => void)[] = [];
  const updateLabelColor = () => {
    label.style.color = binding.isPatched() ? MODIFIED_COLOR : "var(--ui-color-text-secondary)";
  };

  if (schema.kind === "readonly") {
    const span = document.createElement("span");
    span.style.cssText = `color:var(--ui-color-text-muted);font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap`;
    const updateText = () => {
      const v = binding.getValue();
      span.textContent = schema.formatter ? schema.formatter(v) : String(v);
    };
    updateText();
    refreshers.push(updateText);
    valueWrap.appendChild(span);
  } else if (schema.kind === "number") {
    const ed = makeNumberDrag(
      binding,
      () => (binding.getValue() as number) ?? 0,
      (v) => binding.setValue(v)
    );
    valueWrap.appendChild(ed.element);
    refreshers.push(ed.tick);
  } else if (schema.kind === "vec3") {
    const axes = ["X", "Y", "Z"] as const;
    const colors = [AXIS_X_COLOR, AXIS_Y_COLOR, AXIS_Z_COLOR];
    const editors: Editor[] = axes.map((axis, i) => {
      return makeNumberDrag(
        binding,
        () => (binding.getValue() as ArrayLike<number>)?.[i] ?? 0,
        (v) => {
          // Mutate in place: setField will write the whole value, preserving the reference.
          const current = binding.getValue() as ArrayLike<number>;
          const next = new Float32Array([current[0] ?? 0, current[1] ?? 0, current[2] ?? 0]);
          next[i] = v;
          binding.setValue(next);
        },
        axis,
        colors[i]
      );
    });
    editors.forEach((ed) => valueWrap.appendChild(ed.element));
    refreshers.push(...editors.map((ed) => ed.tick));
  } else if (schema.kind === "toggle") {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = Boolean(binding.getValue());
    box.addEventListener("change", () => binding.setValue(box.checked));
    box.style.cssText = "margin:0";
    valueWrap.appendChild(box);
    refreshers.push(() => {
      if (document.activeElement !== box) box.checked = Boolean(binding.getValue());
    });
  } else if (schema.kind === "string") {
    const input = document.createElement("input");
    input.type = "text";
    input.value = String(binding.getValue() ?? "");
    input.style.cssText = `background:var(--ui-color-surface-low);color:var(--ui-color-text-primary);border:1px solid var(--ui-color-neutral-border);border-radius:2px;padding:1px 4px;font:inherit;font-size:10px;outline:none;width:140px`;
    input.addEventListener("change", () => binding.setValue(input.value));
    valueWrap.appendChild(input);
    refreshers.push(() => {
      if (document.activeElement !== input) input.value = String(binding.getValue() ?? "");
    });
  } else if (schema.kind === "enum") {
    const sel = document.createElement("select");
    sel.style.cssText = `background:var(--ui-color-surface-low);color:var(--ui-color-text-primary);border:1px solid var(--ui-color-neutral-border);border-radius:2px;padding:1px 4px;font:inherit;font-size:10px;outline:none`;
    for (const opt of schema.options ?? []) {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    }
    sel.value = String(binding.getValue() ?? "");
    sel.addEventListener("change", () => binding.setValue(sel.value));
    valueWrap.appendChild(sel);
    refreshers.push(() => {
      if (document.activeElement !== sel) sel.value = String(binding.getValue() ?? "");
    });
  }

  if (schema.copyFormat) {
    const fmt = schema.copyFormat;
    valueWrap.appendChild(makeCopyButton(() => fmt(binding.getValue())));
  }

  // Patch clear button — only visible when patched.
  const clearBtn = document.createElement("button");
  clearBtn.textContent = "↺";
  clearBtn.title = "Revert to baseline";
  clearBtn.style.cssText =
    "background:none;border:none;color:var(--ui-color-text-secondary);cursor:pointer;font-size:10px;padding:0 3px;opacity:0";
  clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    revertPatch();
  });
  valueWrap.appendChild(clearBtn);

  function revertPatch(): void {
    // Find this field's patch by iterating host.patches
    for (const p of host.patches.value) {
      if ("entity" in p) {
        if (
          p.component === (binding as unknown as { component: Component }).component &&
          p.field === (binding as unknown as { field: string }).field
        ) {
          host.clearPatch(p.id);
          return;
        }
      }
    }
  }

  const patchVisibility = () => {
    clearBtn.style.opacity = binding.isPatched() ? "0.7" : "0";
    clearBtn.style.pointerEvents = binding.isPatched() ? "auto" : "none";
  };

  return {
    element: wrap,
    tick() {
      for (const r of refreshers) r();
      updateLabelColor();
      patchVisibility();
    },
  };
}

// ── Inspector panel ─────────────────────────────────────────────────

function buildInspectorPanel(
  host: DevToolsHost,
  selected: ReturnType<typeof ref<GameEntity | null>>,
  /** Initial fold state (restored from localStorage by the plugin). */
  foldedComponents: Set<string>,
  /** Called after any fold toggle so the plugin can persist. */
  onFoldChange: () => void
) {
  const root = document.createElement("div");
  root.style.cssText =
    "display:flex;flex-direction:column;height:100%;min-height:0;font-size:11px;line-height:1.5";

  const header = document.createElement("div");
  header.style.cssText = `padding:4px 8px;border-bottom:1px solid var(--ui-color-neutral-border);color:var(--ui-color-text-primary);font-weight:600`;

  const body = document.createElement("div");
  body.style.cssText = "flex:1;overflow:auto;padding:4px 0";

  root.appendChild(header);
  root.appendChild(body);

  let editors: Editor[] = [];

  function renderComponent(entity: GameEntity, component: Component): HTMLElement {
    const section = document.createElement("div");
    section.style.cssText = "margin-bottom:6px";

    const typeName = componentDisplayName(component);
    const folded = foldedComponents.has(typeName);
    const schema = getComponentSchema(component);

    let patchCount = 0;
    if (schema) {
      for (const field of Object.keys(schema.fields)) {
        if (host.isPatched(entity, typeName, field)) patchCount++;
      }
    }

    if (patchCount > 0) {
      section.style.cssText += `;border-left:2px solid ${MODIFIED_COLOR};padding-left:4px`;
    }

    const head = document.createElement("div");
    head.style.cssText = `color:var(--ui-color-primary-text);font-weight:600;cursor:pointer;padding:2px 8px;user-select:none;display:flex;align-items:center`;
    const twisty = document.createElement("span");
    twisty.textContent = folded ? "▶" : "▼";
    twisty.style.cssText = `font-size:8px;margin-right:4px;color:var(--ui-color-text-muted)`;
    head.appendChild(twisty);
    const title = document.createElement("span");
    title.textContent = typeName;
    head.appendChild(title);
    if (patchCount > 0) {
      const badge = document.createElement("span");
      badge.textContent = String(patchCount);
      badge.title = `${patchCount} patched field${patchCount === 1 ? "" : "s"}`;
      badge.style.cssText = `margin-left:6px;font-size:9px;font-weight:500;color:${MODIFIED_COLOR};border:1px solid ${MODIFIED_COLOR};border-radius:8px;padding:0 5px;min-width:14px;text-align:center`;
      head.appendChild(badge);
    }
    head.addEventListener("click", () => {
      if (folded) foldedComponents.delete(typeName);
      else foldedComponents.add(typeName);
      onFoldChange();
      render();
    });
    section.appendChild(head);

    if (folded) return section;

    const target = component as unknown as Record<string, unknown>;

    if (schema) {
      for (const [field, fieldSchema] of Object.entries(schema.fields)) {
        const binding: FieldBinding & { component: Component; field: string } = {
          component,
          field,
          schema: { ...fieldSchema, label: fieldSchema.label ?? field },
          getValue: () => target[field],
          setValue: (v) => host.setField(entity, component, field, v),
          isPatched: () => host.isPatched(entity, typeName, field),
        };
        const editor = makeFieldEditor(binding, host);
        section.appendChild(editor.element);
        editors.push(editor);
      }
    } else {
      // Fallback: read-only field list
      const keys = Object.getOwnPropertyNames(component)
        .filter((k) => !k.startsWith("_") && !k.startsWith("#") && k !== "gameEntity")
        .slice(0, 12);
      for (const key of keys) {
        const value = target[key];
        const row = document.createElement("div");
        row.style.cssText = `padding:1px 0 1px 12px;color:var(--ui-color-text-secondary);font-size:10px`;
        const lbl = document.createElement("span");
        lbl.textContent = key;
        lbl.style.cssText = `min-width:90px;display:inline-block`;
        row.appendChild(lbl);
        const val = document.createElement("span");
        val.style.cssText = `color:var(--ui-color-text-primary)`;
        if (value == null) val.textContent = String(value);
        else if (value instanceof Float32Array)
          val.textContent = `[${Array.from(value)
            .map((n) => n.toFixed(2))
            .join(", ")}]`;
        else if (typeof value === "object") val.textContent = `{…}`;
        else val.textContent = String(value);
        row.appendChild(val);
        section.appendChild(row);
      }
    }

    return section;
  }

  function render(): void {
    editors = [];
    const entity = selected.value;
    if (!entity) {
      header.textContent = "—";
      body.innerHTML = "";
      const empty = document.createElement("div");
      empty.textContent = "no entity selected";
      empty.style.cssText = `padding:8px;color:var(--ui-color-text-muted)`;
      body.appendChild(empty);
      return;
    }

    header.textContent = entityLabel(entity);

    body.innerHTML = "";
    const components = entity.getAllComponents();
    if (components.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "no components";
      empty.style.cssText = `padding:8px;color:var(--ui-color-text-muted)`;
      body.appendChild(empty);
      return;
    }
    for (const c of components) {
      body.appendChild(renderComponent(entity, c));
    }
  }

  function tick(): void {
    for (const ed of editors) ed.tick();
  }

  return { root, render, tick };
}

// ── Plugin ──────────────────────────────────────────────────────────

const SELECTED_KEY = "dalpeng.devtools.scene.selectedEntityName.v1";
const FOLDED_KEY = "dalpeng.devtools.scene.foldedComponents.v1";

function loadSelectedName(): string | null {
  try {
    return localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}
function saveSelectedName(name: string | null): void {
  try {
    if (name) localStorage.setItem(SELECTED_KEY, name);
    else localStorage.removeItem(SELECTED_KEY);
  } catch {
    // private mode / quota — ignore
  }
}
function loadFolded(): Set<string> {
  try {
    const raw = localStorage.getItem(FOLDED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? new Set(arr.filter((x) => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}
function saveFolded(set: Set<string>): void {
  try {
    localStorage.setItem(FOLDED_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export function scenePlugin(): DevToolsPlugin {
  const selected = ref<GameEntity | null>(null);

  // Stable container nodes — populated in setup() below when host connects.
  const treeHost = document.createElement("div");
  treeHost.style.cssText = "display:flex;flex-direction:column;height:100%;min-height:0";
  const inspectorHost = document.createElement("div");
  inspectorHost.style.cssText = "display:flex;flex-direction:column;height:100%;min-height:0";
  const treeNode = adopt(treeHost);
  const inspectorNode = adopt(inspectorHost);

  return definePlugin({
    name: "@dalpeng/devtools/scene",
    version: "0.1.0",

    setup(host) {
      // Restore persisted fold state immediately — entities-agnostic.
      const foldedComponents = loadFolded();
      // Selected entity needs a live entity reference, so wait for the
      // entities list to contain an entity with the saved name.
      const persistedName = loadSelectedName();
      let restoredSelection = false;

      const tree = buildTreePanel(host, selected);
      const inspector = buildInspectorPanel(host, selected, foldedComponents, () =>
        saveFolded(foldedComponents)
      );
      treeHost.appendChild(tree.root);
      inspectorHost.appendChild(inspector.root);

      const unwatchEntities = watch(
        host.entities,
        (entities) => {
          if (selected.value && !entities.includes(selected.value)) {
            selected.value = null;
          }
          // One-shot restore when entity with persisted name appears.
          if (!restoredSelection && persistedName && selected.value === null) {
            const match = entities.find((e) => e.name === persistedName);
            if (match) {
              selected.value = match;
              restoredSelection = true;
            }
          }
          tree.render();
        },
        { immediate: true }
      );

      const unwatchSelection = watch(
        selected,
        (entity) => {
          saveSelectedName(entity?.name ?? null);
          tree.render();
          inspector.render();
        },
        { immediate: true }
      );

      // Rebuild inspector when patches are CLEARED or PINNED (structural change
      // that the tick loop can't express). Drag edits don't clear patches, so
      // this doesn't fire on every drag tick.
      let lastPatchCount = 0;
      const unwatchPatches = watch(host.patches, (patches) => {
        if (patches.length < lastPatchCount) {
          inspector.render();
        }
        lastPatchCount = patches.length;
      });

      // Live refresh: field values + patch indicators at display rate.
      let rafId = requestAnimationFrame(function tick() {
        inspector.tick();
        rafId = requestAnimationFrame(tick);
      });

      return () => {
        unwatchEntities();
        unwatchSelection();
        unwatchPatches();
        cancelAnimationFrame(rafId);
      };
    },

    panels: [
      {
        id: "scene",
        title: "Scene",
        defaultDock: "top",
        ui: defineUI(() => [treeNode]),
      },
      {
        id: "inspector",
        title: "Inspector",
        defaultDock: "right",
        ui: defineUI(() => [inspectorNode]),
      },
    ],
  });
}
