import type { Ref } from "@dalpeng/core";
import { Select, defineUI, useLayout } from "@dalpeng/ui";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";
import { getSettings, listThemes } from "../settings";

export function settingsPlugin(): DevToolsPlugin {
  return definePlugin({
    name: "@dalpeng/devtools/settings",
    version: "0.1.0",

    panels: [
      {
        id: "settings",
        title: "⚙",
        defaultDock: "right",
        ui: defineUI(() => {
          const s = getSettings();
          useLayout("column", { gap: 14 });

          const themeOptions = listThemes().map((name) => ({
            value: name,
            label: name,
          }));

          // `Ref<T>` is invariant in T — cast is safe because each Select's
          // option list is the exact domain of the underlying ref.
          return [
            Select(s.theme as unknown as Ref<string>, "theme", themeOptions),
            Select(s.fontSize as unknown as Ref<string>, "font size", [
              { value: "small", label: "small" },
              { value: "medium", label: "medium" },
              { value: "large", label: "large" },
            ]),
            Select(s.density as unknown as Ref<string>, "density", [
              { value: "compact", label: "compact" },
              { value: "comfortable", label: "comfortable" },
            ]),
          ];
        }),
      },
    ],
  });
}
