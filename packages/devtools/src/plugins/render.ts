import { defineUI } from "@dalpeng/ui";
import type { DevToolsPlugin } from "../plugin";
import { definePlugin } from "../plugin";

/**
 * Feature-toggle panel — temporarily stubbed during UI foundation cutover.
 * The previous `feature()` / BindingSource path was tied to legacy atoms.
 * A new `featureRef(app, key)` helper and a full re-implementation of this
 * panel lands in the DevTools plugin migration wave.
 */
export function renderPlugin(): DevToolsPlugin {
  return definePlugin({
    name: "@dalpeng/devtools/render",
    version: "0.1.0",
    panels: [
      {
        id: "render",
        title: "Render",
        defaultDock: "right",
        ui: defineUI(() => []),
      },
    ],
  });
}
