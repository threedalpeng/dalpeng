import { ref, watch, type Ref } from "@dalpeng/core";
import { defineTheme, type Theme } from "@dalpeng/ui";
import { applyTheme } from "@dalpeng/ui/dom";
import {
  defaultWorkspace,
  deserializeWorkspace,
  serializeWorkspace,
  type Workspace,
} from "./layout";

export type ThemeName = "dark" | "midnight" | "light";
export type DockSide = "right" | "left";
export type FontSize = "small" | "medium" | "large";
export type Density = "compact" | "comfortable";

// DevTools derives its panel theme from @dalpeng/ui's `defineTheme` — CSS vars
// emitted onto the panel root cascade through every plugin subtree. No
// DevTools-private color palette anymore; all tokens flow through --ui-color-*.
const THEMES: Record<ThemeName, Theme> = {
  dark: defineTheme({
    mode: "dark",
    seeds: { primary: "#4a90e2", neutral: "#2a2e35" },
  }),
  midnight: defineTheme({
    mode: "dark",
    seeds: { primary: "#7aa2f7", neutral: "#1a2237" },
  }),
  light: defineTheme({
    mode: "light",
    seeds: { primary: "#1f6feb", neutral: "#d4d8df" },
  }),
};

export function getTheme(name: ThemeName): Theme {
  return THEMES[name];
}

export function listThemes(): ThemeName[] {
  return Object.keys(THEMES) as ThemeName[];
}

const DENSITY_PAD: Record<Density, string> = {
  compact: "6px 10px",
  comfortable: "12px 14px",
};

const FONT_PX: Record<FontSize, string> = {
  small: "11px",
  medium: "12px",
  large: "13px",
};

export function densityPad(d: Density): string {
  return DENSITY_PAD[d];
}

export function fontSizePx(f: FontSize): string {
  return FONT_PX[f];
}

export interface DevToolsSettings {
  theme: Ref<ThemeName>;
  side: Ref<DockSide>;
  width: Ref<number>;
  fontSize: Ref<FontSize>;
  density: Ref<Density>;
  workspace: Ref<Workspace>;
}

interface PersistedSettings {
  theme: ThemeName;
  side: DockSide;
  width: number;
  fontSize: FontSize;
  density: Density;
  workspace: string;
}

const STORAGE_KEY = "dalpeng.devtools.settings.v3";

const DEFAULTS: PersistedSettings = {
  theme: "dark",
  side: "right",
  width: 420,
  fontSize: "medium",
  density: "comfortable",
  workspace: serializeWorkspace(defaultWorkspace()),
};

function loadPersisted(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function savePersisted(s: PersistedSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore — private mode, quota exceeded, etc.
  }
}

let settingsSingleton: DevToolsSettings | null = null;

export type RegionId = "top" | "middle" | "bottom";

export function regionForDock(dock: string | undefined): RegionId {
  if (dock === "top") return "top";
  if (dock === "bottom") return "bottom";
  return "middle";
}

export function getSettings(): DevToolsSettings {
  if (settingsSingleton) return settingsSingleton;
  const persisted = loadPersisted();
  const restoredWs = deserializeWorkspace(persisted.workspace) ?? defaultWorkspace();

  const settings: DevToolsSettings = {
    theme: ref<ThemeName>(persisted.theme),
    side: ref<DockSide>(persisted.side),
    width: ref<number>(persisted.width),
    fontSize: ref<FontSize>(persisted.fontSize),
    density: ref<Density>(persisted.density),
    workspace: ref<Workspace>(restoredWs),
  };
  const persist = () => {
    savePersisted({
      theme: settings.theme.value,
      side: settings.side.value,
      width: settings.width.value,
      fontSize: settings.fontSize.value,
      density: settings.density.value,
      workspace: serializeWorkspace(settings.workspace.value),
    });
  };
  watch(settings.theme, persist);
  watch(settings.side, persist);
  watch(settings.width, persist);
  watch(settings.fontSize, persist);
  watch(settings.density, persist);
  watch(settings.workspace, persist);
  settingsSingleton = settings;
  return settings;
}

// Applies the theme's full CSS var surface on the panel root. The previous
// `--dt-*` slot palette is gone — plugins reference `var(--ui-color-*)` now.
export function applyThemeVariables(el: HTMLElement, theme: Theme): () => void {
  return applyTheme(el, theme);
}

// DevTools-specific sizing slots (not colors). Kept because DevTools UI has
// its own density / font-size toggles independent of the theme's token scale.
export function applySizingVariables(el: HTMLElement, fontSize: FontSize, density: Density): void {
  el.style.setProperty("--dt-font-size", fontSizePx(fontSize));
  el.style.setProperty("--dt-pad", densityPad(density));
}
