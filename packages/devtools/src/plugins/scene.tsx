import { computed, ref, watch, type Component, type GameEntity } from "@dalpeng/core";
import { For, Show, defineUI } from "@dalpeng/ui";
import { Section, Toolbar, Tree, type TreeNode } from "@dalpeng/ui/dom";
import { componentDisplayName, getComponentSchema, type FieldSchema } from "../editSchema";
import type { DevToolsHost } from "../host";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

const MODIFIED_COLOR = "#f59e0b";
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

// ─── Field editor (imperative — drag / tick refresh) ──────────────────────

interface FieldBinding {
  schema: FieldSchema;
  getValue(): unknown;
  setValue(v: unknown): void;
  isPatched(): boolean;
}

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
  input.style.cssText =
    "width:58px;background:var(--ui-color-surface-low);color:var(--ui-color-text-primary);border:1px solid var(--ui-color-neutral-border);border-radius:2px;padding:1px 4px;font:inherit;font-size:10px;outline:none;text-align:right;cursor:ew-resize";
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
  label.style.cssText = "color:var(--ui-color-text-secondary);min-width:90px;font-size:10px";
  wrap.appendChild(label);

  const valueWrap = document.createElement("span");
  valueWrap.style.cssText = "flex:1;display:flex;align-items:center;min-width:0";
  wrap.appendChild(valueWrap);

  const refreshers: (() => void)[] = [];
  const updateLabelColor = (): void => {
    label.style.color = binding.isPatched() ? MODIFIED_COLOR : "var(--ui-color-text-secondary)";
  };

  if (schema.kind === "readonly") {
    const span = document.createElement("span");
    span.style.cssText =
      "color:var(--ui-color-text-muted);font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    const updateText = (): void => {
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
    const editors: Editor[] = axes.map((axis, i) =>
      makeNumberDrag(
        binding,
        () => (binding.getValue() as ArrayLike<number>)?.[i] ?? 0,
        (v) => {
          const current = binding.getValue() as ArrayLike<number>;
          const next = new Float32Array([current[0] ?? 0, current[1] ?? 0, current[2] ?? 0]);
          next[i] = v;
          binding.setValue(next);
        },
        axis,
        colors[i]
      )
    );
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
    input.style.cssText =
      "background:var(--ui-color-surface-low);color:var(--ui-color-text-primary);border:1px solid var(--ui-color-neutral-border);border-radius:2px;padding:1px 4px;font:inherit;font-size:10px;outline:none;width:140px";
    input.addEventListener("change", () => binding.setValue(input.value));
    valueWrap.appendChild(input);
    refreshers.push(() => {
      if (document.activeElement !== input) input.value = String(binding.getValue() ?? "");
    });
  } else if (schema.kind === "enum") {
    const sel = document.createElement("select");
    sel.style.cssText =
      "background:var(--ui-color-surface-low);color:var(--ui-color-text-primary);border:1px solid var(--ui-color-neutral-border);border-radius:2px;padding:1px 4px;font:inherit;font-size:10px;outline:none";
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

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "↺";
  clearBtn.title = "Revert to baseline";
  clearBtn.style.cssText =
    "background:none;border:none;color:var(--ui-color-text-secondary);cursor:pointer;font-size:10px;padding:0 3px;opacity:0";
  clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
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
  });
  valueWrap.appendChild(clearBtn);

  const patchVisibility = (): void => {
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

// ─── Persistence ─────────────────────────────────────────────────────────

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
    /* private mode / quota */
  }
}
function loadFolded(): Set<string> {
  try {
    const raw = localStorage.getItem(FOLDED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr)
      ? new Set(arr.filter((x): x is string => typeof x === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}
function saveFolded(set: Set<string>): void {
  try {
    localStorage.setItem(FOLDED_KEY, JSON.stringify([...set]));
  } catch {
    /* private mode / quota */
  }
}

// ─── Tree mapping — GameEntity → TreeNode ────────────────────────────────

function toTreeNodes(entities: readonly GameEntity[], filter: string): TreeNode[] {
  const roots = entities.filter((e) => !e.parent && matchesFilter(e, filter));
  return roots.map((r) => buildNode(r, filter));
}

function buildNode(entity: GameEntity, filter: string): TreeNode {
  const children = entity.children.filter((c) => matchesFilter(c, filter));
  return {
    id: String(entity.id),
    label: entityLabel(entity),
    children: children.length > 0 ? children.map((c) => buildNode(c, filter)) : undefined,
  };
}

// ─── Plugin ───────────────────────────────────────────────────────────────

export function scenePlugin(): DevToolsPlugin {
  const selected = ref<GameEntity | null>(null);
  let currentHost: DevToolsHost | null = null;
  const hostRef = (): DevToolsHost => {
    if (!currentHost) throw new Error("scene plugin: host accessed before setup");
    return currentHost;
  };

  const foldedComponents = loadFolded();
  const toggleFold = (typeName: string, folded: boolean): void => {
    if (folded) foldedComponents.add(typeName);
    else foldedComponents.delete(typeName);
    saveFolded(foldedComponents);
  };

  const filter = ref("");
  const treeNodes = computed<TreeNode[]>(() => {
    const host = currentHost;
    if (!host) return [];
    return toTreeNodes(host.entities.value, filter.value);
  });
  const selectedId = computed<string | null>(() =>
    selected.value ? String(selected.value.id) : null
  );

  const onTreeSelect = (id: string): void => {
    const host = hostRef();
    const entity = host.entities.value.find((e) => String(e.id) === id) ?? null;
    if (entity) {
      selected.value = entity;
      host.emit("entitySelected", { entity });
    }
  };

  return definePlugin({
    name: "@dalpeng/devtools/scene",
    version: "0.1.0",

    setup(host) {
      currentHost = host;
      const persistedName = loadSelectedName();
      let restoredSelection = false;

      const unwatchEntities = watch(
        host.entities,
        (entities) => {
          if (selected.value && !entities.includes(selected.value)) {
            selected.value = null;
          }
          if (!restoredSelection && persistedName && selected.value === null) {
            const match = entities.find((e) => e.name === persistedName);
            if (match) {
              selected.value = match;
              restoredSelection = true;
            }
          }
        },
        { immediate: true }
      );

      const unwatchSelection = watch(selected, (entity) => {
        saveSelectedName(entity?.name ?? null);
      });

      return () => {
        unwatchEntities();
        unwatchSelection();
        currentHost = null;
      };
    },

    panels: [
      {
        id: "scene",
        title: "Scene",
        defaultDock: "top",
        ui: defineUI(() => (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              minHeight: 0,
            }}
          >
            <Toolbar border>
              <input
                type="text"
                placeholder="🔍 filter entities…"
                ref={(el) => {
                  const input = el as HTMLInputElement;
                  input.value = filter.value;
                  const onInput = (): void => {
                    filter.value = input.value.trim();
                  };
                  input.addEventListener("input", onInput);
                  return () => input.removeEventListener("input", onInput);
                }}
                style={{
                  flex: 1,
                  background: "$color.surface.low",
                  color: "$color.text.primary",
                  border: "1px solid",
                  borderColor: "$color.neutral.border",
                  borderRadius: "$radius.sm",
                  paddingX: "$spacing.sm",
                  paddingY: "$spacing.xs",
                  fontSize: "$font.size.xs",
                  outline: "none",
                }}
              />
            </Toolbar>
            <Tree nodes={treeNodes} selected={selectedId} defaultExpanded onSelect={onTreeSelect} />
          </div>
        )),
      },
      {
        id: "inspector",
        title: "Inspector",
        defaultDock: "right",
        ui: defineUI(() => (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              minHeight: 0,
              fontSize: "$font.size.xs",
              lineHeight: 1.5,
            }}
          >
            <InspectorHeader selected={selected} />
            <InspectorBody
              selected={selected}
              hostRef={hostRef}
              foldedComponents={foldedComponents}
              onFoldToggle={toggleFold}
            />
          </div>
        )),
      },
    ],
  });
}

function InspectorHeader({ selected }: { selected: ReturnType<typeof ref<GameEntity | null>> }) {
  const label = computed(() => (selected.value ? entityLabel(selected.value) : "—"));
  return (
    <div
      style={{
        paddingX: "$spacing.sm",
        paddingY: "$spacing.xs",
        borderBottom: "1px solid",
        borderColor: "$color.neutral.border",
        color: "$color.text.primary",
        fontWeight: "$font.weight.semibold",
      }}
    >
      {label}
    </div>
  );
}

interface InspectorCtx {
  selected: ReturnType<typeof ref<GameEntity | null>>;
  hostRef: () => DevToolsHost;
  foldedComponents: Set<string>;
  onFoldToggle: (typeName: string, folded: boolean) => void;
}

function InspectorBody(ctx: InspectorCtx) {
  const hasSelection = computed(() => ctx.selected.value !== null);
  return (
    <div style={{ flex: 1, overflow: "auto", paddingY: "$spacing.xs" }}>
      <Show
        when={hasSelection}
        body={<InspectorContent {...ctx} />}
        fallback={
          <div style={{ padding: "$spacing.sm", color: "$color.text.muted" }}>
            no entity selected
          </div>
        }
      />
    </div>
  );
}

function InspectorContent(ctx: InspectorCtx) {
  const components = computed<readonly Component[]>(() => {
    const e = ctx.selected.value;
    return e ? e.getAllComponents() : [];
  });

  const hasComponents = computed(() => components.value.length > 0);

  return (
    <Show
      when={hasComponents}
      body={
        <For
          items={components}
          key={(c) => componentDisplayName(c)}
          render={(c) => <ComponentSection component={c} {...ctx} />}
        />
      }
      fallback={
        <div style={{ padding: "$spacing.sm", color: "$color.text.muted" }}>no components</div>
      }
    />
  );
}

function ComponentSection({
  component,
  selected,
  hostRef,
  foldedComponents,
  onFoldToggle,
}: InspectorCtx & { component: Component }) {
  const typeName = componentDisplayName(component);
  return (
    <Section
      title={typeName}
      defaultCollapsed={foldedComponents.has(typeName)}
      onToggle={(folded) => onFoldToggle(typeName, folded)}
    >
      <ComponentFields component={component} selected={selected} host={hostRef()} />
    </Section>
  );
}

function ComponentFields({
  component,
  selected,
  host,
}: {
  component: Component;
  selected: ReturnType<typeof ref<GameEntity | null>>;
  host: DevToolsHost;
}) {
  return (
    <div
      ref={(el) => {
        const body = el as HTMLElement;
        const entity = selected.value;
        if (!entity) return;

        const typeName = componentDisplayName(component);
        const schema = getComponentSchema(component);
        const editors: Editor[] = [];
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
            const ed = makeFieldEditor(binding, host);
            body.appendChild(ed.element);
            editors.push(ed);
          }
        } else {
          // Fallback — read-only field list.
          const keys = Object.getOwnPropertyNames(component)
            .filter((k) => !k.startsWith("_") && !k.startsWith("#") && k !== "gameEntity")
            .slice(0, 12);
          for (const key of keys) {
            const value = target[key];
            const row = document.createElement("div");
            row.style.cssText =
              "padding:1px 0 1px 12px;color:var(--ui-color-text-secondary);font-size:10px";
            const lbl = document.createElement("span");
            lbl.textContent = key;
            lbl.style.cssText = "min-width:90px;display:inline-block";
            row.appendChild(lbl);
            const val = document.createElement("span");
            val.style.cssText = "color:var(--ui-color-text-primary)";
            if (value == null) val.textContent = String(value);
            else if (value instanceof Float32Array)
              val.textContent = `[${Array.from(value)
                .map((n) => n.toFixed(2))
                .join(", ")}]`;
            else if (typeof value === "object") val.textContent = `{…}`;
            else val.textContent = String(value);
            row.appendChild(val);
            body.appendChild(row);
          }
        }

        // Live refresh loop — field values + patch indicators at display rate.
        let rafId = requestAnimationFrame(function tick() {
          for (const ed of editors) ed.tick();
          rafId = requestAnimationFrame(tick);
        });

        return () => {
          cancelAnimationFrame(rafId);
          while (body.firstChild) body.removeChild(body.firstChild);
        };
      }}
    />
  );
}
