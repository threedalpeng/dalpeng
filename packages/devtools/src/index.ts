export { definePlugin } from "./plugin";
export type { DevToolsPanel, DevToolsPlugin, PanelDock, PluginTeardown } from "./plugin";

export { createDevToolsHost } from "./createHost";
export type { DevToolsHost } from "./host";

export { PluginRegistry, type RegisteredPanel } from "./registry";

export { attachDevTools, type AttachDevToolsOptions, type DevToolsHandle } from "./attach";
export { DevToolsRootHost, type DevToolsRootHostOptions } from "./hostFrame";

export { consolePlugin } from "./plugins/console";
export { layersPlugin } from "./plugins/layers";
export { performancePlugin } from "./plugins/performance";
export { renderPlugin } from "./plugins/render";
export { scenePlugin } from "./plugins/scene";
export { settingsPlugin } from "./plugins/settings";

export {
  applySizingVariables,
  applyThemeVariables,
  getSettings,
  getTheme,
  listThemes,
  type Density,
  type DevToolsSettings,
  type DevToolsTheme,
  type DockSide,
  type FontSize,
  type ThemeName,
} from "./settings";
