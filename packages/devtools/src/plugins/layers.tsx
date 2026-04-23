import { computed, ref, watch, type Application } from "@dalpeng/core";
import { For, Show, defineUI } from "@dalpeng/ui";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

interface LayerRow {
  index: number;
  name: string;
  backend: string;
  sort: string;
}

export function layersPlugin(): DevToolsPlugin {
  const currentApp = ref<Application | null>(null);

  const layers = computed<readonly LayerRow[]>(() => {
    const app = currentApp.value;
    if (!app) return [];
    return app.layers.ordered.map((l) => ({
      index: l.index,
      name: l.name,
      backend: l.backend,
      sort: typeof l.sort === "string" ? l.sort : "custom",
    }));
  });

  const userDeclared = computed(() => currentApp.value?.layers.isUserDeclared ?? false);
  const hasApp = computed(() => currentApp.value !== null);

  return definePlugin({
    name: "@dalpeng/devtools/layers",
    version: "0.1.0",

    setup(host) {
      return watch(
        host.app,
        (app) => {
          currentApp.value = app;
        },
        { immediate: true }
      );
    },

    panels: [
      {
        id: "layers",
        title: "Layers",
        defaultDock: "bottom",
        ui: defineUI(() => (
          <div
            style={{
              fontFamily: "inherit",
              fontSize: "$font.size.xs",
              lineHeight: 1.6,
              maxHeight: "100%",
              overflow: "auto",
            }}
          >
            <Show
              when={hasApp}
              body={<LayerList layers={layers} userDeclared={userDeclared} />}
              fallback={
                <div style={{ color: "$color.text.muted", padding: "$spacing.sm" }}>no app yet</div>
              }
            />
          </div>
        )),
      },
    ],
  });
}

function LayerList({
  layers,
  userDeclared,
}: {
  layers: ReturnType<typeof computed<readonly LayerRow[]>>;
  userDeclared: ReturnType<typeof computed<boolean>>;
}) {
  const headerText = computed(() =>
    userDeclared.value
      ? `user-declared layer set (${layers.value.length})`
      : "default layer set — call withLayers([...]) to customise"
  );
  return (
    <div>
      <div
        ref={(el) => {
          const div = el as HTMLElement;
          const apply = (v: boolean): void => {
            div.style.color = v ? "var(--ui-color-text-secondary)" : "var(--ui-color-text-muted)";
          };
          apply(userDeclared.value);
          return watch(userDeclared, apply);
        }}
        style={{ marginBottom: "$spacing.sm" }}
      >
        {headerText}
      </div>
      <For items={layers} key={(l) => l.name} render={(l) => <LayerRow row={l} />} />
    </div>
  );
}

function LayerRow({ row }: { row: LayerRow }) {
  const backendColor = row.backend === "canvas" ? "$color.success.text" : "$color.info.text";
  return (
    <div
      style={{
        paddingY: "$spacing.xs",
        borderBottom: "1px solid",
        borderColor: "$color.neutral.border",
      }}
    >
      <span style={{ color: "$color.text.muted" }}>{`#${row.index}`}</span>
      <span
        style={{
          color: "$color.text.primary",
          fontWeight: "$font.weight.semibold",
          marginLeft: "$spacing.xs",
        }}
      >
        {row.name}
      </span>
      <span style={{ color: backendColor, marginLeft: "$spacing.sm" }}>{row.backend}</span>
      <span style={{ color: "$color.text.secondary", marginLeft: "$spacing.sm" }}>
        {`sort:${row.sort}`}
      </span>
    </div>
  );
}
