export {
  defineUI,
  Text,
  Bar,
  Html,
  Toggle,
  Range,
  Select,
  Button,
  Value,
  Menu,
  List,
  Split,
  Tabs,
  For,
  Show,
  Floating,
  useFeature,
  useLayout,
  usePlacement,
  withLayer,
} from "./define";

export { createDialogueController } from "./dialogue/controller";
export type { DialogueController } from "./dialogue/controller";
export { Dialogue } from "./dialogue/Dialogue";
export type {
  DialogueLine,
  DialogueChoice,
} from "./dialogue/types";

export {
  resolvePlacement,
  type Placement,
  type Anchor,
  type Size,
  type Vec2,
  type ViewportCorner,
  type ResolvedPlacement,
} from "./placement";

export { renderDescriptor, type RenderContext, type RenderResult } from "./domRenderer";

export type {
  NodeDescriptor,
  TextOpts,
  BarOpts,
  RangeOpts,
  SelectOption,
  MenuItem,
  BindingSource,
  SplitOpts,
  TabsOpts,
  TabSpec,
  ForOpts,
  ShowOpts,
  FloatingOpts,
} from "./types";

export { getThisUI, requireUI, type UIContext } from "./context";

export { domUIRenderer } from "./uiRenderer";
