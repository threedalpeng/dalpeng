import { ref, watch, type Ref } from "@dalpeng/core";
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

/** Token bag applied as CSS custom properties on the host root. */
export interface DevToolsTheme {
  bg: string;
  bgMuted: string;
  bgSunken: string;
  fg: string;
  fgMuted: string;
  fgDim: string;
  border: string;
  accent: string;
  hover: string;
  selected: string;
  shadow: string;
}

const THEMES: Record<ThemeName, DevToolsTheme> = {
  dark: {
    bg: "rgba(18, 20, 24, 0.96)",
    bgMuted: "#15171c",
    bgSunken: "#0f1116",
    fg: "#e6e8ec",
    fgMuted: "#9ba3b0",
    fgDim: "#6b7280",
    border: "#2a2e35",
    accent: "#4a90e2",
    hover: "rgba(255, 255, 255, 0.04)",
    selected: "#1f242c",
    shadow: "rgba(0, 0, 0, 0.4)",
  },
  midnight: {
    bg: "rgba(8, 12, 22, 0.98)",
    bgMuted: "#070b16",
    bgSunken: "#04060d",
    fg: "#dee5f1",
    fgMuted: "#7d8aa3",
    fgDim: "#4a5468",
    border: "#1a2237",
    accent: "#7aa2f7",
    hover: "rgba(122, 162, 247, 0.08)",
    selected: "#152033",
    shadow: "rgba(0, 0, 0, 0.6)",
  },
  light: {
    bg: "rgba(252, 252, 253, 0.98)",
    bgMuted: "#f0f1f3",
    bgSunken: "#e6e8ec",
    fg: "#1f242c",
    fgMuted: "#5a6270",
    fgDim: "#9098a4",
    border: "#d4d8df",
    accent: "#1f6feb",
    hover: "rgba(0, 0, 0, 0.04)",
    selected: "#dbe5f1",
    shadow: "rgba(0, 0, 0, 0.12)",
  },
};

export function getTheme(name: ThemeName): DevToolsTheme {
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

// Singleton shared across the page. Persisted to localStorage so the user's
// last layout survives reloads. Storage failures (private mode, quota) are
// silently ignored.

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
  /** Serialized workspace layout (JSON string). */
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

/** Maps panel dock preference to one of the three workspace regions. */
export type RegionId = "top" | "middle" | "bottom";

export function regionForDock(dock: string | undefined): RegionId {
  if (dock === "top") return "top";
  if (dock === "bottom") return "bottom";
  return "middle";
}

/**
 * Lazily-constructed singleton. All DevTools surfaces share the same bundle
 * so state is consistent across the dock, settings panel, and popup.
 */
export function getSettings(): DevToolsSettings {
  if (settingsSingleton) return settingsSingleton;
  const persisted = loadPersisted();
  // Failed deserialise (corrupt JSON, schema bump) falls back to default —
  // never block startup on bad persisted state.
  const restoredWs =
    deserializeWorkspace(persisted.workspace) ?? defaultWorkspace();

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

/** Apply a theme's tokens as CSS custom properties on the host element. */
export function applyThemeVariables(
  el: HTMLElement,
  theme: DevToolsTheme,
): void {
  el.style.setProperty("--dt-bg", theme.bg);
  el.style.setProperty("--dt-bg-muted", theme.bgMuted);
  el.style.setProperty("--dt-bg-sunken", theme.bgSunken);
  el.style.setProperty("--dt-fg", theme.fg);
  el.style.setProperty("--dt-fg-muted", theme.fgMuted);
  el.style.setProperty("--dt-fg-dim", theme.fgDim);
  el.style.setProperty("--dt-border", theme.border);
  el.style.setProperty("--dt-accent", theme.accent);
  el.style.setProperty("--dt-hover", theme.hover);
  el.style.setProperty("--dt-selected", theme.selected);
  el.style.setProperty("--dt-shadow", theme.shadow);
}

/** Apply font-size and density tokens. */
export function applySizingVariables(
  el: HTMLElement,
  fontSize: FontSize,
  density: Density,
): void {
  el.style.setProperty("--dt-font-size", fontSizePx(fontSize));
  el.style.setProperty("--dt-pad", densityPad(density));
}
