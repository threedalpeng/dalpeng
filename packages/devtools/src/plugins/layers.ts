import { watch } from "@dalpeng/core";
import { defineUI, type NodeDescriptor } from "@dalpeng/ui";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function layersPlugin(): DevToolsPlugin {
  const container = document.createElement("div");
  container.style.cssText =
    "font-family:inherit;font-size:11px;line-height:1.6;max-height:100%;overflow:auto";
  container.innerHTML = '<div style="color:var(--dt-fg-dim)">no app yet</div>';

  const liveNode: NodeDescriptor = {
    type: "live",
    element: container,
    cleanups: new Set(),
  };

  return definePlugin({
    name: "@dalpeng/devtools/layers",
    version: "0.1.0",

    setup(host) {
      const renderLayers = () => {
        const app = host.app.value;
        if (!app) {
          container.innerHTML =
            '<div style="color:var(--dt-fg-dim)">no app yet</div>';
          return;
        }
        const layers = app.layers.ordered;
        const userDeclared = app.layers.isUserDeclared;
        const headerHtml = userDeclared
          ? `<div style="color:var(--dt-fg-muted);margin-bottom:8px">user-declared layer set (${layers.length})</div>`
          : `<div style="color:var(--dt-fg-dim);margin-bottom:8px">default layer set — call <code>withLayers([...])</code> to customise</div>`;
        const rows = layers
          .map((l) => {
            const backendColor =
              l.backend === "canvas" ? "#7be0a1" : "#7aa2f7";
            const sortLabel =
              typeof l.sort === "string" ? l.sort : "custom";
            return `<div style="padding:4px 0;border-bottom:1px solid var(--dt-border)">
              <span style="color:var(--dt-fg-dim)">#${l.index}</span>
              <span style="color:var(--dt-fg);font-weight:600;margin-left:6px">${escapeHtml(l.name)}</span>
              <span style="color:${backendColor};margin-left:8px">${l.backend}</span>
              <span style="color:var(--dt-fg-muted);margin-left:8px">sort:${escapeHtml(sortLabel)}</span>
            </div>`;
          })
          .join("");
        container.innerHTML = headerHtml + rows;
      };

      const unwatch = watch(host.app, () => renderLayers(), { immediate: true });
      return unwatch;
    },

    panels: [
      {
        id: "layers",
        title: "Layers",
        defaultDock: "bottom",
        ui: defineUI(() => [liveNode]),
      },
    ],
  });
}
