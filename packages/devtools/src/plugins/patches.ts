import { watch, type Application } from "@dalpeng/core";
import { defineUI, type UIChild } from "@dalpeng/ui";
import type { AnyPatch, DevToolsHost, FeaturePatch } from "../host";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

function isFeaturePatch(p: AnyPatch): p is FeaturePatch {
  return (p as FeaturePatch).key !== undefined;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isArrayLike(v: unknown): v is ArrayLike<number> {
  return (
    v != null &&
    typeof v === "object" &&
    typeof (v as { length?: unknown }).length === "number" &&
    !(v instanceof Map) &&
    !(v instanceof Set) &&
    !(v instanceof Date)
  );
}

function formatValue(v: unknown): string {
  if (v == null) return String(v);
  if (typeof v === "number") return v.toFixed(3).replace(/\.?0+$/, "");
  if (typeof v === "string") return `"${v}"`;
  if (typeof v !== "object") return String(v);
  if (ArrayBuffer.isView(v)) {
    const arr = Array.from(v as unknown as ArrayLike<number>);
    return `[${arr.map((n) => n.toFixed(3).replace(/\.?0+$/, "")).join(", ")}]`;
  }
  if (isArrayLike(v)) {
    const arr = Array.from(v as ArrayLike<number>);
    return `[${arr.map((n) => (typeof n === "number" ? n.toFixed(3).replace(/\.?0+$/, "") : String(n))).join(", ")}]`;
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function liveValueOf(patch: AnyPatch, app: Application | null): unknown {
  if (isFeaturePatch(patch)) {
    const features = app?.features as unknown as Record<string, unknown> | undefined;
    return features?.[patch.key];
  }
  return (patch.component as unknown as Record<string, unknown>)[patch.field];
}

export function patchesPlugin(): DevToolsPlugin {
  const root = document.createElement("div");
  root.style.cssText = "display:flex;flex-direction:column;height:100%;min-height:0;font-size:11px";

  const bar = document.createElement("div");
  bar.style.cssText =
    "display:flex;gap:4px;padding:4px 6px;border-bottom:1px solid var(--dt-border);align-items:center";

  const countBadge = document.createElement("span");
  countBadge.style.cssText = "color:var(--dt-fg-dim);font-size:10px;flex:1";

  const exportBtn = document.createElement("button");
  exportBtn.textContent = "export";
  exportBtn.title = "copy all patches to clipboard as code comment";
  exportBtn.style.cssText =
    "background:var(--dt-bg-sunken);color:var(--dt-fg);border:1px solid var(--dt-border);border-radius:2px;padding:2px 8px;font:inherit;font-size:10px;cursor:pointer";

  const clearAllBtn = document.createElement("button");
  clearAllBtn.textContent = "revert all";
  clearAllBtn.title = "revert every ephemeral + pinned patch";
  clearAllBtn.style.cssText =
    "background:var(--dt-bg-sunken);color:var(--dt-fg-muted);border:1px solid var(--dt-border);border-radius:2px;padding:2px 8px;font:inherit;font-size:10px;cursor:pointer";

  bar.appendChild(countBadge);
  bar.appendChild(exportBtn);
  bar.appendChild(clearAllBtn);

  const list = document.createElement("div");
  list.style.cssText = "flex:1;overflow:auto;padding:2px 0";

  root.appendChild(bar);
  root.appendChild(list);

  const liveNode: UIChild = { type: "live", element: root, cleanups: new Set() };

  let currentHost: DevToolsHost | null = null;
  let latest: readonly AnyPatch[] = [];

  function render(): void {
    const host = currentHost;
    if (!host) return;

    const pinnedCount = latest.filter((p) => p.kind === "pinned").length;
    const ephCount = latest.length - pinnedCount;
    countBadge.textContent =
      latest.length === 0
        ? "no patches"
        : `${latest.length} patch${latest.length === 1 ? "" : "es"} · ${pinnedCount} pinned · ${ephCount} ephemeral`;

    clearAllBtn.disabled = latest.length === 0;
    exportBtn.disabled = latest.length === 0;

    if (latest.length === 0) {
      list.innerHTML =
        '<div style="color:#6b7280;padding:8px">no patches yet — edit any field in the Scene inspector to create one</div>';
      return;
    }

    const app = host.app.value;
    const rows = latest
      .map((p) => {
        const title = isFeaturePatch(p)
          ? `features.${escapeHtml(p.key)}`
          : `${escapeHtml(p.entityName || "(unnamed)")} · ${escapeHtml(p.componentType)}.${escapeHtml(p.field)}`;
        const live = liveValueOf(p, app);
        const pinned = p.kind === "pinned";
        const kindBadge = pinned
          ? '<span style="color:#e8c372;font-size:9px;padding:1px 4px;border:1px solid #e8c372;border-radius:2px">pinned</span>'
          : '<span style="color:#6b7280;font-size:9px;padding:1px 4px;border:1px solid #3a4048;border-radius:2px">ephemeral</span>';
        return `<div class="patch-row" data-id="${escapeHtml(p.id)}" style="padding:4px 6px;border-bottom:1px solid #1f242c;display:flex;flex-direction:column;gap:2px">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="flex:1;color:var(--dt-fg)">${title}</span>
            ${kindBadge}
            <button class="patch-pin" data-id="${escapeHtml(p.id)}" ${pinned ? "disabled" : ""} title="pin patch (survives reload)" style="background:var(--dt-bg-sunken);color:var(--dt-fg-muted);border:1px solid var(--dt-border);border-radius:2px;padding:1px 6px;font:inherit;font-size:10px;cursor:${pinned ? "default" : "pointer"};opacity:${pinned ? "0.4" : "1"}">pin</button>
            <button class="patch-revert" data-id="${escapeHtml(p.id)}" title="revert to baseline" style="background:var(--dt-bg-sunken);color:#e26b6b;border:1px solid var(--dt-border);border-radius:2px;padding:1px 6px;font:inherit;font-size:10px;cursor:pointer">revert</button>
          </div>
          <div style="color:var(--dt-fg-dim);font-size:10px;padding-left:2px">
            <span style="color:#6b7280">baseline:</span> ${escapeHtml(formatValue(p.baselineValue))} → <span style="color:var(--dt-fg)">${escapeHtml(formatValue(live))}</span>
          </div>
        </div>`;
      })
      .join("");
    list.innerHTML = rows;
  }

  list.addEventListener("click", (ev) => {
    const host = currentHost;
    if (!host) return;
    const target = ev.target as HTMLElement;
    const pinBtn = target.closest<HTMLButtonElement>("button.patch-pin");
    if (pinBtn) {
      const id = pinBtn.dataset.id;
      if (id) host.pinPatch(id);
      return;
    }
    const revertBtn = target.closest<HTMLButtonElement>("button.patch-revert");
    if (revertBtn) {
      const id = revertBtn.dataset.id;
      if (id) host.clearPatch(id);
    }
  });

  exportBtn.addEventListener("click", () => {
    const host = currentHost;
    if (!host) return;
    const text = host.exportPatches();
    void navigator.clipboard.writeText(text).then(
      () => {
        const original = exportBtn.textContent;
        exportBtn.textContent = "copied ✓";
        setTimeout(() => {
          exportBtn.textContent = original;
        }, 1200);
      },
      () => {
        exportBtn.textContent = "copy failed";
        setTimeout(() => {
          exportBtn.textContent = "export";
        }, 1500);
      }
    );
  });

  clearAllBtn.addEventListener("click", () => {
    currentHost?.clearAllPatches();
  });

  return definePlugin({
    name: "@dalpeng/devtools/patches",
    version: "0.1.0",

    setup(host) {
      currentHost = host;
      const unwatch = watch(
        host.patches,
        (patches) => {
          latest = patches;
          render();
        },
        { immediate: true }
      );
      return () => {
        unwatch();
        currentHost = null;
      };
    },

    panels: [
      {
        id: "patches",
        title: "Patches",
        defaultDock: "right",
        ui: defineUI(() => [liveNode]),
      },
    ],
  });
}
