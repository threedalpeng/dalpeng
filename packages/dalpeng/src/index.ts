import { Application, GameEntity, Scene } from "@dalpeng/core";
export { vec2, vec3, vec4 } from "@dalpeng/math";

export {
  Animator,
  AudioHandle,
  AudioManager,
  Camera,
  CameraFollow2D,
  Easings,
  InputManager,
  Light,
  MeshBuilder,
  MeshRenderer,
  ParticleEmitter,
  Script,
  Shader,
  Skeleton,
  SkinnedMeshRenderer,
  Sprite2DRenderer,
  SpriteAnimator,
  SpriteAtlas,
  SpriteRenderer,
  TileCollider,
  TiledImporter,
  TilemapRenderer,
  Time,
  Transform,
  Tween,
  TweenManager,
  type EventMap,
} from "@dalpeng/core";
export type {
  AtlasFrame,
  ParsedObjectLayer,
  ParsedTiledMap,
  ParsedTileLayer,
  ParsedTileset,
  SpriteAnimationClip,
  TilemapLayerBatch,
  TriggerZone,
} from "@dalpeng/core";

export {
  runApp,
  withCanvasOptions,
  withFeatures,
  withLayers,
  type AppRunOptions,
} from "./hooks/app";

export type {
  AppNode,
  EntityNode,
  Layer,
  LayerBackend,
  LayerMember,
  LayerSort,
  ResolvedLayer,
  UINode,
} from "@dalpeng/core";
export * from "./hooks/index";

export { batch, computed, isRef, ref, watch, type ReadonlyRef, type Ref } from "./reactive";

export {
  adopt,
  // Theme factory + helpers
  auditTheme,
  // Composites
  Badge,
  Bar,
  // Atoms
  Button,
  Card,
  createDialogueController,
  createElement,
  defaultTheme,
  defineTheme,
  defineUI,
  defineWidget,
  // Dialogue
  Dialogue,
  Floating,
  For,
  // Primitives
  Fragment,
  h,
  Html,
  IconButton,
  Menu,
  Range,
  Row,
  Section,
  Select,
  Show,
  Split,
  Suspense,
  Tabs,
  Text,
  ThemeProvider,
  toColorRole,
  Toggle,
  Toolbar,
  Tree,
  // UI scope + hooks
  useLayout,
  // The UI-side withLayer is NOT re-exported here separately — gameEntity.ts
  // exports a polymorphic withLayer that dispatches to whichever scope is active.
  usePlacement,
  useTheme,
  Value,
} from "@dalpeng/ui";

export type {
  // Runtime types
  AdoptedElement,
  Anchor,
  // Composite props
  BadgeProps,
  BadgeRole,
  BadgeVariant,
  BarOpts,
  // Atom props
  ButtonProps,
  CardElevation,
  CardPadding,
  CardProps,
  Child,
  // Theme
  ColorMode,
  ColorRole,
  ColorScale,
  ColorSeeds,
  ColorSteps,
  DefineThemeInput,
  // Dialogue
  DialogueChoice,
  DialogueController,
  DialogueLine,
  FloatingOpts,
  ForOpts,
  HostProps,
  HtmlProps,
  IconButtonProps,
  IconButtonSize,
  IconButtonVariant,
  MenuItem,
  MenuOpts,
  // Placement
  Placement,
  PropsWithChildren,
  RangeProps,
  RowProps,
  SectionProps,
  SelectOption,
  SelectProps,
  ShowOpts,
  Size,
  SplitOpts,
  Style,
  StylePreset,
  Surface,
  TabsOpts,
  TabSpec,
  TextProps,
  Theme,
  ThemeColor,
  ThemeColorExtensions,
  ThemeProviderProps,
  ToggleProps,
  ToolbarAlign,
  ToolbarDensity,
  ToolbarProps,
  TreeNode,
  TreeProps,
  UIElement,
  Vec2,
  ViewportCorner,
  Widget,
} from "@dalpeng/ui";
export { useDialogueController } from "./hooks/dialogue";

export { type Application, type GameEntity, type Scene };
