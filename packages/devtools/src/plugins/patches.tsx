import { computed, type Application } from "@dalpeng/core";
import { For, Show, defineUI } from "@dalpeng/ui";
import { Badge, IconButton, Toolbar } from "@dalpeng/ui/dom";
import type { AnyPatch, DevToolsHost, FeaturePatch } from "../host";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

function isFeaturePatch(p: AnyPatch): p is FeaturePatch {
  return (p as FeaturePatch).key !== undefined;
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

function patchTitle(p: AnyPatch): string {
  if (isFeaturePatch(p)) return `features.${p.key}`;
  return `${p.entityName || "(unnamed)"} · ${p.componentType}.${p.field}`;
}

export function patchesPlugin(): DevToolsPlugin {
  let currentHost: DevToolsHost | null = null;
  const boundHost = (): DevToolsHost => {
    if (!currentHost) throw new Error("patches plugin: accessed host before setup");
    return currentHost;
  };

  const renderPanel = (host: DevToolsHost) => {
    const patches = host.patches;
    const count = computed(() => {
      const list = patches.value;
      if (list.length === 0) return "no patches";
      const pinned = list.filter((p) => p.kind === "pinned").length;
      const eph = list.length - pinned;
      return `${list.length} patch${list.length === 1 ? "" : "es"} · ${pinned} pinned · ${eph} ephemeral`;
    });
    const hasPatches = computed(() => patches.value.length > 0);

    const onExport = async (e: MouseEvent): Promise<void> => {
      const btn = e.currentTarget as HTMLButtonElement;
      const original = btn.textContent;
      try {
        await navigator.clipboard.writeText(host.exportPatches());
        btn.textContent = "copied ✓";
      } catch {
        btn.textContent = "copy failed";
      }
      setTimeout(() => {
        btn.textContent = original;
      }, 1200);
    };

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          fontSize: "$font.size.xs",
        }}
      >
        <Toolbar border align="between">
          <span style={{ color: "$color.text.muted", fontSize: "$font.size.xs" }}>{count}</span>
          <div style={{ display: "flex", gap: "$spacing.xs" }}>
            <button
              type="button"
              onClick={(e: MouseEvent) => void onExport(e)}
              title="copy all patches to clipboard as code comment"
              style={toolbarBtn}
            >
              export
            </button>
            <button
              type="button"
              onClick={() => host.clearAllPatches()}
              title="revert every ephemeral + pinned patch"
              style={toolbarBtn}
            >
              revert all
            </button>
          </div>
        </Toolbar>
        <div style={{ flex: 1, overflow: "auto", padding: "$spacing.xs" }}>
          <Show
            when={hasPatches}
            body={
              <For
                items={patches}
                key={(p) => p.id}
                render={(p) => <PatchRow patch={p} host={boundHost()} />}
              />
            }
            fallback={
              <div style={{ color: "$color.text.muted", padding: "$spacing.sm" }}>
                no patches yet — edit any field in the Scene inspector to create one
              </div>
            }
          />
        </div>
      </div>
    );
  };

  return definePlugin({
    name: "@dalpeng/devtools/patches",
    version: "0.1.0",

    setup(host) {
      currentHost = host;
      return () => {
        currentHost = null;
      };
    },

    panels: [
      {
        id: "patches",
        title: "Patches",
        defaultDock: "right",
        ui: defineUI(() => renderPanel(boundHost())),
      },
    ],
  });
}

function PatchRow({ patch, host }: { patch: AnyPatch; host: DevToolsHost }) {
  const pinned = patch.kind === "pinned";
  const liveText = formatValue(liveValueOf(patch, host.app.value));
  const baseText = formatValue(patch.baselineValue);
  return (
    <div
      style={{
        padding: "$spacing.xs $spacing.sm",
        borderBottom: "1px solid",
        borderColor: "$color.neutral.border",
        display: "flex",
        flexDirection: "column",
        gap: "$spacing.xs",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "$spacing.sm" }}>
        <span style={{ flex: 1, color: "$color.text.primary" }}>{patchTitle(patch)}</span>
        <Badge label={pinned ? "pinned" : "ephemeral"} role={pinned ? "warning" : "neutral"} />
        <IconButton
          label="pin"
          title="pin patch (survives reload)"
          disabled={pinned}
          size="sm"
          onClick={() => host.pinPatch(patch.id)}
        >
          📌
        </IconButton>
        <IconButton
          label="revert"
          title="revert to baseline"
          size="sm"
          onClick={() => host.clearPatch(patch.id)}
        >
          ↺
        </IconButton>
      </div>
      <div style={{ color: "$color.text.muted", fontSize: "$font.size.xs" }}>
        <span style={{ color: "$color.text.muted" }}>baseline:</span> {baseText} →{" "}
        <span style={{ color: "$color.text.primary" }}>{liveText}</span>
      </div>
    </div>
  );
}

const toolbarBtn = {
  background: "$color.surface.low",
  color: "$color.text.primary",
  border: "1px solid",
  borderColor: "$color.neutral.border",
  borderRadius: "$radius.sm",
  paddingX: "$spacing.sm",
  paddingY: "$spacing.xs",
  fontSize: "$font.size.xs",
  cursor: "pointer",
  fontFamily: "inherit",
};
