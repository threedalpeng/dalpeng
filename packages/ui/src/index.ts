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
  useFeature,
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

export { renderDescriptor, type RenderContext, type RenderResult } from "./domRenderer";

export type {
  BarOpts,
  BindingSource,
  FloatingOpts,
  ForOpts,
  MenuItem,
  NodeDescriptor,
  RangeOpts,
  SelectOption,
  ShowOpts,
  SplitOpts,
  TabSpec,
  TabsOpts,
  TextOpts,
} from "./types";

export { getThisUI, requireUI, type UIContext } from "./context";

export { domUIRenderer } from "./uiRenderer";
