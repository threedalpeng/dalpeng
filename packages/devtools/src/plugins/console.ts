import { watch } from "@dalpeng/core";
import { defineUI, type NodeDescriptor } from "@dalpeng/ui";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

const LEVEL_COLORS: Record<string, string> = {
  trace: "#6b7280",
  debug: "#9ba3b0",
  info: "#cbd5e1",
  warn: "#e8c372",
  error: "#e26b6b",
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function consolePlugin(): DevToolsPlugin {
  // Live DOM element — `Html(...)` is static so we hand-build and subscribe
  // its innerHTML to `host.logs` via `watch`.
  const container = document.createElement("div");
  container.style.cssText =
    "font-family:inherit;font-size:11px;line-height:1.5;max-height:100%;overflow:auto";
  container.innerHTML = '<div style="color:#6b7280">no log entries yet</div>';

  const cleanups = new Set<() => void>();
  const liveNode: NodeDescriptor = { type: "live", element: container, cleanups };

  return definePlugin({
    name: "@dalpeng/devtools/console",
    version: "0.1.0",

    setup(host) {
      const unwatch = watch(
        host.logs,
        (entries) => {
          if (entries.length === 0) {
            container.innerHTML = '<div style="color:#6b7280">no log entries yet</div>';
            return;
          }
          const rows = entries
            .slice(-200)
            .map((e) => {
              const ts = (e.timestamp / 1000).toFixed(2);
              const color = LEVEL_COLORS[e.level] ?? "#e6e8ec";
              return `<div style="padding:2px 0;border-bottom:1px solid #1f242c;color:${color}"><span style="color:#6b7280">[${ts}] [${e.module}]</span> ${escapeHtml(e.message)}</div>`;
            })
            .join("");
          container.innerHTML = rows;
          container.scrollTop = container.scrollHeight;
        },
        { immediate: true }
      );
      cleanups.add(unwatch);
      return () => {
        cleanups.forEach((fn) => fn());
        cleanups.clear();
      };
    },

    panels: [
      {
        id: "console",
        title: "Console",
        defaultDock: "bottom",
        ui: defineUI(() => [liveNode]),
      },
    ],
  });
}
