import type { UINode } from "@dalpeng/core";
import type { DevToolsHost } from "./host";

/** No-props `defineUI(...)` result. */
export type UIFactory = () => UINode;

/** Where a panel prefers to dock. The host may override based on its layout. */
export type PanelDock = "right" | "left" | "bottom" | "top" | "floating";

export interface DevToolsPanel {
  /** Stable identifier — unique within the plugin, ideally globally unique. */
  id: string;
  /** Human-friendly tab title. */
  title: string;
  /** Preferred dock side; the host may override. */
  defaultDock?: PanelDock;
  /** Default size hint (px). Host frame may clamp/ignore. */
  defaultWidth?: number;
  defaultHeight?: number;
  ui: UIFactory;
}

/** Teardown function returned by `setup`. Called on unregister or HMR. */
export type PluginTeardown = () => void;

export interface DevToolsPlugin {
  /** Unique plugin name. Convention: `@scope/package` or `pkg:plugin`. */
  name: string;
  /** Optional version string for diagnostics. */
  version?: string;
  /**
   * Called once when registered. Subscribe to host signals here.
   * Return a teardown function or nothing.
   * Invariant: host calls `setup` once and the returned teardown once per plugin lifetime.
   */
  setup?: (host: DevToolsHost) => PluginTeardown | void;
  /** Panels contributed by this plugin. Panel ids must be unique within the plugin. */
  panels?: DevToolsPanel[];
}

/** Identity function at runtime — provides precise typing and validates required fields. */
export function definePlugin(plugin: DevToolsPlugin): DevToolsPlugin {
  if (!plugin.name) {
    throw new Error("definePlugin: `name` is required.");
  }
  if (plugin.panels) {
    const seen = new Set<string>();
    for (const panel of plugin.panels) {
      if (!panel.id) {
        throw new Error(`definePlugin(${plugin.name}): every panel needs an \`id\`.`);
      }
      if (seen.has(panel.id)) {
        throw new Error(`definePlugin(${plugin.name}): duplicate panel id "${panel.id}".`);
      }
      seen.add(panel.id);
    }
  }
  return plugin;
}
