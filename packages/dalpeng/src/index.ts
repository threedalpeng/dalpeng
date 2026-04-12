import { Application, GameEntity, Scene } from "@dalpeng/core";
export { vec2, vec3, vec4 } from "@dalpeng/math";

export {
  Animator,
  AudioHandle,
  AudioManager,
  Camera,
  CameraFollow2D,
  Easings,
  EventEmitter,
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

export { computed, isRef, ref, watch, type ReadonlyRef, type Ref } from "./reactive";

export {
  Bar,
  Button,
  createDialogueController,
  defineUI,
  Dialogue,
  Html,
  List,
  Menu,
  Range,
  renderUI,
  Select,
  Text,
  Toggle,
  useFeature,
  useLayout,
  // The UI-side withLayer is NOT re-exported here separately — gameEntity.ts
  // exports a polymorphic withLayer that dispatches to whichever scope is active.
  usePlacement,
  Value,
} from "@dalpeng/ui";
export type {
  Anchor,
  DialogueChoice,
  DialogueController,
  DialogueLine,
  MenuItem,
  NodeDescriptor,
  Placement,
  RenderContext,
  Size,
  Vec2,
  ViewportCorner,
} from "@dalpeng/ui";
export { useDialogueController } from "./hooks/dialogue";

export { type Application, type GameEntity, type Scene };
