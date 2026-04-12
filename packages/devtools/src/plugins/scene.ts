import { ref, watch, type GameEntity } from "@dalpeng/core";
import { defineUI, type NodeDescriptor } from "@dalpeng/ui";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

function entityLabel(e: GameEntity): string {
  const name = e.name || `<unnamed #${e.id}>`;
  const parts: string[] = [];
  if (e.tag && e.tag !== "default") parts.push(`[${e.tag}]`);
  // `_layerName` is an engine-internal field stamped by the `withLayer` hook.
  if (e._layerName) parts.push(`<${e._layerName}>`);
  return parts.length ? `${name}  ${parts.join(" ")}` : name;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function scenePlugin(): DevToolsPlugin {
  const selected = ref<GameEntity | null>(null);

  const treeContainer = document.createElement("div");
  treeContainer.style.cssText =
    "font-family:inherit;font-size:11px;line-height:1.6;max-height:100%;overflow:auto";

  const inspectorContainer = document.createElement("div");
  inspectorContainer.style.cssText = "font-family:inherit;font-size:11px;line-height:1.5";
  inspectorContainer.innerHTML = '<div style="color:#6b7280">no entity selected</div>';

  const treeNode: NodeDescriptor = {
    type: "live",
    element: treeContainer,
    cleanups: new Set(),
  };
  const inspectorNode: NodeDescriptor = {
    type: "live",
    element: inspectorContainer,
    cleanups: new Set(),
  };

  function renderInspector(entity: GameEntity | null): void {
    if (!entity) {
      inspectorContainer.innerHTML = '<div style="color:#6b7280">no entity selected</div>';
      return;
    }
    const components = entity.getAllComponents();
    const rows = components
      .map((c) => {
        const typeName = c.constructor.name;
        // Avoid JSON.stringify — components may hold cyclic refs (e.g. `gameEntity` back-pointer).
        const fields = Object.getOwnPropertyNames(c)
          .filter((k) => !k.startsWith("_") && !k.startsWith("#") && k !== "gameEntity")
          .slice(0, 8)
          .map((k) => {
            const v = (c as unknown as Record<string, unknown>)[k];
            let display: string;
            if (v == null) display = String(v);
            else if (typeof v === "object") display = `{…}`;
            else display = String(v);
            return `<div style="padding-left:12px;color:#9ba3b0">${escapeHtml(k)}: <span style="color:#cbd5e1">${escapeHtml(display)}</span></div>`;
          })
          .join("");
        return `<div style="margin-bottom:8px"><div style="color:#7be0a1;font-weight:600">${escapeHtml(typeName)}</div>${fields}</div>`;
      })
      .join("");
    inspectorContainer.innerHTML =
      `<div style="margin-bottom:6px"><span style="color:#e6e8ec;font-weight:600">${escapeHtml(entityLabel(entity))}</span></div>` +
      (rows || '<div style="color:#6b7280">no components</div>');
  }

  function renderTree(entities: readonly GameEntity[]): void {
    if (entities.length === 0) {
      treeContainer.innerHTML = '<div style="color:#6b7280">no entities</div>';
      return;
    }
    // `entitiesRef` is a flat list; filter to roots and walk children.
    const roots = entities.filter((e) => !e.parent);
    treeContainer.innerHTML = "";
    for (const root of roots) {
      treeContainer.appendChild(renderEntityRow(root, 0));
    }
  }

  function renderEntityRow(entity: GameEntity, depth: number): HTMLElement {
    const wrap = document.createElement("div");
    const row = document.createElement("div");
    row.textContent = entityLabel(entity);
    Object.assign(row.style, {
      paddingLeft: `${depth * 14}px`,
      cursor: "pointer",
      color: selected.value === entity ? "#7be0a1" : "#cbd5e1",
    } satisfies Partial<CSSStyleDeclaration>);
    row.addEventListener("click", (e) => {
      e.stopPropagation();
      selected.value = entity;
    });
    wrap.appendChild(row);
    for (const child of entity.children) {
      wrap.appendChild(renderEntityRow(child, depth + 1));
    }
    return wrap;
  }

  return definePlugin({
    name: "@dalpeng/devtools/scene",
    version: "0.1.0",

    setup(host) {
      const unwatchEntities = watch(
        host.entities,
        (entities) => {
          if (selected.value && !entities.includes(selected.value)) {
            selected.value = null;
          }
          renderTree(entities);
        },
        { immediate: true }
      );

      const unwatchSelection = watch(
        selected,
        (entity) => {
          renderInspector(entity);
          renderTree(host.entities.value);
        },
        { immediate: true }
      );

      return () => {
        unwatchEntities();
        unwatchSelection();
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
