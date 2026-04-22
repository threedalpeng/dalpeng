export {
  Bar,
  Button,
  Floating,
  For,
  Html,
  List,
  Menu,
  Range,
  Select,
  Show,
  Split,
  Tabs,
  Text,
  Toggle,
  Value,
  defineUI,
  feature,
  useLayout,
  usePlacement,
  withLayer,
} from "./define";

export { createDialogueController } from "./dialogue/controller";
export type { DialogueController } from "./dialogue/controller";
export { Dialogue } from "./dialogue/Dialogue";
export type { DialogueChoice, DialogueLine } from "./dialogue/types";

export {
  resolvePlacement,
  type Anchor,
  type Placement,
  type ResolvedPlacement,
  type Size,
  type Vec2,
  type ViewportCorner,
} from "./placement";

export { renderUI, type RenderContext, type RenderResult } from "./domRenderer";

export type {
  BarOpts,
  BindingSource,
  FloatingOpts,
  ForOpts,
  MenuItem,
  RangeOpts,
  SelectOption,
  ShowOpts,
  SplitOpts,
  TabSpec,
  TabsOpts,
  TextOpts,
  UIChild,
} from "./types";

export { getThisUI, requireUI, type UIContext } from "./context";

export { domUIRenderer } from "./uiRenderer";

// ── PR1 — Foundation runtime (coexists with legacy above) ───────────
// New primitives land here. Legacy `UIChild` path above stays untouched
// until PR3 atom migration — see docs/plans/2026-04-22-ui-foundation.md.

export {
  Fragment,
  createElement,
  h,
  isComponent,
  isFragment,
  isHost,
  isText,
  normalizeChildren,
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
  type RenderContext as ElementRenderContext,
  type RenderResult as ElementRenderResult,
  type MountHandle,
  type MountOptions,
} from "./render";
