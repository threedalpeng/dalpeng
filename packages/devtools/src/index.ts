export { definePlugin } from "./plugin";
export type { DevToolsPanel, DevToolsPlugin, PanelDock, PluginTeardown } from "./plugin";

export { createDevToolsHost } from "./createHost";
export type {
  AtlasInfo,
  DevToolsHost,
  FeaturePatch,
  HostEvents,
  Patch,
  PatchId,
  TextureInfo,
} from "./host";

export {
  enumField,
  getComponentSchema,
  numberField,
  quatCodeFormat,
  readonlyField,
  registerComponentSchema,
  stringField,
  toggleField,
  vec3CodeFormat,
  vec3Field,
  type ComponentSchema,
  type FieldKind,
  type FieldSchema,
} from "./editSchema";

export { registerDefaultSchemas } from "./defaultSchemas";

export { PluginRegistry, type RegisteredPanel } from "./registry";

export { attachDevTools, type AttachDevToolsOptions, type DevToolsHandle } from "./attach";
export { DevToolsRootHost, type DevToolsRootHostOptions } from "./hostFrame";

export { assetsPlugin } from "./plugins/assets";
export { consolePlugin } from "./plugins/console";
export { layersPlugin } from "./plugins/layers";
export { patchesPlugin } from "./plugins/patches";
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
