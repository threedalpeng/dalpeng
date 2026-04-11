export { definePlugin } from "./plugin";
export type {
  DevToolsPlugin,
  DevToolsPanel,
  PanelDock,
  PluginTeardown,
} from "./plugin";

export type { DevToolsHost } from "./host";
export { createDevToolsHost } from "./createHost";

export { PluginRegistry, type RegisteredPanel } from "./registry";

export {
  DevToolsRootHost,
  type DevToolsRootHostOptions,
} from "./hostFrame";
export {
  attachDevTools,
  type AttachDevToolsOptions,
  type DevToolsHandle,
} from "./attach";

export { performancePlugin } from "./plugins/performance";
export { consolePlugin } from "./plugins/console";
export { scenePlugin } from "./plugins/scene";
export { renderPlugin } from "./plugins/render";
export { layersPlugin } from "./plugins/layers";
export { settingsPlugin } from "./plugins/settings";

export {
  getSettings,
  getTheme,
  listThemes,
  applyThemeVariables,
  applySizingVariables,
  type DevToolsSettings,
  type DevToolsTheme,
  type ThemeName,
  type DockSide,
  type FontSize,
  type Density,
} from "./settings";
