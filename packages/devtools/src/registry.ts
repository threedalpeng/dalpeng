import { computed, ref, type ReadonlyRef } from "@dalpeng/core";
import type { DevToolsHost } from "./host";
import type { DevToolsPanel, DevToolsPlugin, PluginTeardown } from "./plugin";

interface RegisteredPlugin {
  plugin: DevToolsPlugin;
  teardown: PluginTeardown | undefined;
}

export interface RegisteredPanel {
  /** Globally-unique key — `${plugin.name}:${panel.id}`. */
  key: string;
  pluginName: string;
  panel: DevToolsPanel;
}

export class PluginRegistry {
  #registered: RegisteredPlugin[] = [];
  #version = ref(0);

  /** Every panel from every registered plugin, in registration order. */
  panels: ReadonlyRef<readonly RegisteredPanel[]> = computed(() => {
    void this.#version.value;
    const out: RegisteredPanel[] = [];
    for (const { plugin } of this.#registered) {
      if (!plugin.panels) continue;
      for (const panel of plugin.panels) {
        out.push({
          key: `${plugin.name}:${panel.id}`,
          pluginName: plugin.name,
          panel,
        });
      }
    }
    return out;
  });

  /** Calls `plugin.setup(host)` immediately and stores any returned teardown. */
  register(plugin: DevToolsPlugin, host: DevToolsHost): void {
    const teardown = plugin.setup?.(host) ?? undefined;
    this.#registered.push({ plugin, teardown });
    this.#version.value++;
  }

  /** Unregisters a plugin by name, running its teardown. No-op if not found. */
  unregister(name: string): void {
    const idx = this.#registered.findIndex((r) => r.plugin.name === name);
    if (idx < 0) return;
    const [removed] = this.#registered.splice(idx, 1);
    try {
      removed.teardown?.();
    } catch (err) {
      console.error(`[devtools] teardown failed for plugin "${removed.plugin.name}":`, err);
    }
    this.#version.value++;
  }

  /** Teardown every registered plugin. */
  clear(): void {
    for (const { plugin, teardown } of this.#registered) {
      try {
        teardown?.();
      } catch (err) {
        console.error(`[devtools] teardown failed for plugin "${plugin.name}":`, err);
      }
    }
    this.#registered = [];
    this.#version.value++;
  }
}
