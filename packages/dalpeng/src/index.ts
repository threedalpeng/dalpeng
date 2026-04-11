import { Application, GameEntity, Scene } from "@dalpeng/core";
export { vec2, vec3, vec4 } from "@dalpeng/math";

export { EventEmitter, type EventMap } from "@dalpeng/core";
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
} from "@dalpeng/core";
export type {
  AtlasFrame,
  ParsedObjectLayer,
  ParsedTileLayer,
  ParsedTiledMap,
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
  Layer,
  LayerBackend,
  LayerSort,
  LayerMember,
  ResolvedLayer,
} from "@dalpeng/core";
export * from "./hooks/index";

export {
  ref,
  computed,
  watch,
  isRef,
  type Ref,
  type ReadonlyRef,
} from "./reactive";

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
  useLayout,
  useFeature,
  // The UI-side withLayer is NOT re-exported here separately — gameEntity.ts
  // exports a polymorphic withLayer that dispatches to whichever scope is active.
  usePlacement,
  renderDescriptor,
} from "@dalpeng/ui";
export type {
  NodeDescriptor,
  RenderContext,
  MenuItem,
  Placement,
  Anchor,
  ViewportCorner,
  Size,
  Vec2,
} from "@dalpeng/ui";
export type { DialogueLine, DialogueChoice } from "@dalpeng/ui";
export { createDialogueController, Dialogue } from "@dalpeng/ui";
export type { DialogueController } from "@dalpeng/ui";
export { useDialogueController } from "./hooks/dialogue";

export { type Application, type GameEntity, type Scene };
