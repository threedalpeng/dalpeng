// ── Runtime primitives ─────────────────────────────────────────────
export {
  Fragment,
  adopt,
  createElement,
  h,
  isAdopted,
  isComponent,
  isFragment,
  isHost,
  isText,
  normalizeChildren,
  type AdoptedElement,
  type Child,
  type Component,
  type ComponentElement,
  type FragmentElement,
  type HostElement,
  type HostProps,
  type PropsWithChildren,
  type TextElement,
  type UIElement,
} from "./element";

export { defineComponent } from "./component";

export {
  bindAttr,
  bindClass,
  bindStyle,
  bindText,
  bindValue,
  listen,
  type AttrValue,
  type Cleanup,
} from "./bindings";

export {
  LENGTH_KEYS,
  UNITLESS_KEYS,
  expandShortcut,
  resolveStyleValue,
  type CSSVarName,
  type Style,
  type StyleValue,
} from "./style";

export { applyTheme, defaultTheme, defineTheme, useTheme, type Theme } from "./theme";

export {
  mount,
  renderElement,
  type MountHandle,
  type MountOptions,
  type RenderContext,
  type RenderResult,
} from "./render";

export { defineUI } from "./defineUI";

// ── UI scope + hooks ───────────────────────────────────────────────
export {
  getThisUI,
  pushUIScope,
  requireUI,
  useLayout,
  usePlacement,
  withLayer,
  type UIContext,
} from "./context";

// ── Scene UI renderer plugin ───────────────────────────────────────
export { domUIRenderer } from "./uiRenderer";

// ── Atoms ──────────────────────────────────────────────────────────
export { Button } from "./atoms/Button";
export { Floating, type FloatingOpts } from "./atoms/Floating";
export { For, type ForOpts } from "./atoms/For";
export { Html } from "./atoms/Html";
export { Range, type RangeOpts } from "./atoms/Range";
export { Select, type SelectOption } from "./atoms/Select";
export { Show, type ShowOpts } from "./atoms/Show";
export { Split, type SplitOpts } from "./atoms/Split";
export { Tabs, type TabSpec, type TabsOpts } from "./atoms/Tabs";
export { Text, type TextOpts } from "./atoms/Text";
export { Toggle } from "./atoms/Toggle";

// ── Composites ─────────────────────────────────────────────────────
export { Bar, type BarOpts } from "./composites/Bar";
export { Menu, type MenuItem, type MenuOpts } from "./composites/Menu";
export { Value } from "./composites/Value";

// ── Placement ──────────────────────────────────────────────────────
export {
  resolvePlacement,
  type Anchor,
  type Placement,
  type ResolvedPlacement,
  type Size,
  type Vec2,
  type ViewportCorner,
} from "./placement";

// ── Dialogue ───────────────────────────────────────────────────────
export { createDialogueController, type DialogueController } from "./dialogue/controller";
export { Dialogue } from "./dialogue/Dialogue";
export type { DialogueChoice, DialogueLine } from "./dialogue/types";
