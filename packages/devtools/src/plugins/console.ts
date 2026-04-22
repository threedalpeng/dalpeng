import { watch, type LogEntry, type LogLevel } from "@dalpeng/core";
import { adopt, defineUI } from "@dalpeng/ui";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: "#6b7280",
  debug: "#9ba3b0",
  info: "#cbd5e1",
  warn: "#e8c372",
  error: "#e26b6b",
};

const LEVEL_RANK: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

const LEVEL_OPTIONS: LogLevel[] = ["trace", "debug", "info", "warn", "error"];

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function consolePlugin(): DevToolsPlugin {
  const root = document.createElement("div");
  root.style.cssText = "display:flex;flex-direction:column;height:100%;min-height:0;font-size:11px";

  const bar = document.createElement("div");
  bar.style.cssText =
    "display:flex;gap:4px;padding:4px 6px;border-bottom:1px solid var(--ui-color-neutral-border);align-items:center";

  const levelSelect = document.createElement("select");
  levelSelect.style.cssText =
    "background:var(--ui-color-surface-low);color:var(--ui-color-text-primary);border:1px solid var(--ui-color-neutral-border);border-radius:2px;padding:2px 4px;font:inherit;font-size:10px;outline:none";
  for (const lv of LEVEL_OPTIONS) {
    const o = document.createElement("option");
    o.value = lv;
    o.textContent = `≥ ${lv}`;
    if (lv === "info") o.selected = true;
    levelSelect.appendChild(o);
  }

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "🔍 filter…";
  searchInput.style.cssText =
    "flex:1;background:var(--ui-color-surface-low);color:var(--ui-color-text-primary);border:1px solid var(--ui-color-neutral-border);border-radius:2px;padding:2px 6px;font:inherit;font-size:10px;outline:none";

  const clearBtn = document.createElement("button");
  clearBtn.textContent = "clear";
  clearBtn.style.cssText =
    "background:var(--ui-color-surface-low);color:var(--ui-color-text-secondary);border:1px solid var(--ui-color-neutral-border);border-radius:2px;padding:2px 8px;font:inherit;font-size:10px;cursor:pointer";

  const countBadge = document.createElement("span");
  countBadge.style.cssText =
    "color:var(--ui-color-text-muted);font-size:10px;min-width:50px;text-align:right";

  bar.appendChild(levelSelect);
  bar.appendChild(searchInput);
  bar.appendChild(countBadge);
  bar.appendChild(clearBtn);

  // ── Log list ─────────────────────────────────────────────────────
  const list = document.createElement("div");
  list.style.cssText = "flex:1;overflow:auto;padding:2px 0";
  list.innerHTML = '<div style="color:#6b7280;padding:8px">no log entries yet</div>';

  root.appendChild(bar);
  root.appendChild(list);

  const liveNode = adopt(root);

  let minLevel: LogLevel = "info";
  let query = "";
  let latestEntries: readonly LogEntry[] = [];
  let autoScroll = true;

  list.addEventListener("scroll", () => {
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 20;
    autoScroll = atBottom;
  });

  levelSelect.addEventListener("change", () => {
    minLevel = levelSelect.value as LogLevel;
    render();
  });

  searchInput.addEventListener("input", () => {
    query = searchInput.value.trim().toLowerCase();
    render();
  });

  clearBtn.addEventListener("click", () => {
    // Clear consumes the current buffer visually — actual Logger buffer stays.
    // To really clear would require `Logger.clear()`; here we just hide current entries.
    minLevel = (levelSelect.value as LogLevel) ?? "info";
    query = "";
    searchInput.value = "";
    render();
    list.scrollTop = list.scrollHeight;
  });

  function render(): void {
    if (latestEntries.length === 0) {
      list.innerHTML = '<div style="color:#6b7280;padding:8px">no log entries yet</div>';
      countBadge.textContent = "0";
      return;
    }
    const minRank = LEVEL_RANK[minLevel];
    const filtered = latestEntries.filter((e) => {
      if (LEVEL_RANK[e.level] < minRank) return false;
      if (query) {
        const hay = `${e.module} ${e.message}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    countBadge.textContent = `${filtered.length}/${latestEntries.length}`;

    if (filtered.length === 0) {
      list.innerHTML = '<div style="color:#6b7280;padding:8px">no matches</div>';
      return;
    }

    const rows = filtered
      .slice(-500)
      .map((e) => {
        const ts = (e.timestamp / 1000).toFixed(2);
        const color = LEVEL_COLORS[e.level];
        const source = e.source
          ? ` <span style="color:#4a5568;font-size:9px" title="${escapeHtml(e.source)}">${escapeHtml(e.source)}</span>`
          : "";
        return `<div style="padding:2px 6px;border-bottom:1px solid #1f242c;color:${color};white-space:pre-wrap;word-break:break-word"><span style="color:#6b7280">[${ts}] [${e.module}]</span> ${escapeHtml(e.message)}${source}</div>`;
      })
      .join("");
    list.innerHTML = rows;
    if (autoScroll) list.scrollTop = list.scrollHeight;
  }

  return definePlugin({
    name: "@dalpeng/devtools/console",
    version: "0.1.0",

    setup(host) {
      const unwatch = watch(
        host.logs,
        (entries) => {
          latestEntries = entries;
          render();
        },
        { immediate: true }
      );
      return unwatch;
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
