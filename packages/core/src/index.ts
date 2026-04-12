import Application from "./Application";
import InputManager, { MouseButton } from "./InputManager";
import Scene from "./Scene";
import Time from "./Time";
import Animator from "./animation/Animator";
import Skeleton from "./animation/Skeleton";
import Tween from "./animation/Tween";
import TweenManager from "./animation/TweenManager";
import { Easings } from "./animation/easings";
import ModelManager from "./asset/ModelManager";
import SpriteAtlasManager from "./asset/SpriteAtlasManager";
import TextureManager from "./asset/TextureManager";
import AudioHandle from "./audio/AudioHandle";
import AudioManager from "./audio/AudioManager";
import { ErrorTracker, FrameProfiler, Logger } from "./debug";
import Component from "./ecs/Component";
import GameEntity from "./ecs/GameEntity";
import Script from "./ecs/Script";
import Transform from "./ecs/Transform";
import Camera from "./graphics/Camera";
import Light from "./graphics/Light";
import Material from "./graphics/Material";
import MeshRenderer from "./graphics/MeshRenderer";
import ParticleEmitter from "./graphics/ParticleEmitter";
import Shader from "./graphics/Shader";
import SkinnedMeshRenderer from "./graphics/SkinnedMeshRenderer";
import SpriteRenderer from "./graphics/SpriteRenderer";
import CameraFollow2D from "./graphics2d/CameraFollow2D";
import Sprite2DRenderer from "./graphics2d/Sprite2DRenderer";
import SpriteAnimator from "./graphics2d/SpriteAnimator";
import SpriteAtlas from "./graphics2d/SpriteAtlas";
import TileCollider from "./graphics2d/TileCollider";
import TilemapRenderer from "./graphics2d/TilemapRenderer";
import TiledImporter from "./graphics2d/tiled/TiledImporter";
import { GLTFParser } from "./utils/gltf/GLTFParser";
import MeshBuilder from "./utils/mesh";
import { worldToScreen } from "./utils/worldToScreen";
export type { FrameStatsSummary } from "./Application";
export type { CanvasOptions } from "./CanvasOptions";
export type { RenderConfig } from "./RenderConfig";
export type { TweenOptions } from "./animation/Tween";
export type { GPUMesh, GPUPrimitive, ModelAsset } from "./asset/ModelManager";
export type { TextureLoadOptions } from "./asset/TextureManager";
export type { PlayOptions } from "./audio/AudioManager";
export type {
  FrameStats,
  GLError,
  LogEntry,
  LogLevel,
  LogModule,
  PassTiming,
  Toast,
} from "./debug";
export type { ParticleEmitterConfig } from "./graphics/ParticleEmitter";
export type { SpriteAnimationClip } from "./graphics2d/SpriteAnimationClip";
export type { AtlasFrame } from "./graphics2d/SpriteAtlas";
export type { TilemapLayerBatch } from "./graphics2d/TilemapRenderer";
export type { TriggerZone } from "./graphics2d/TriggerZone";
export type {
  ParsedObjectLayer,
  ParsedTiledMap,
  ParsedTileLayer,
  ParsedTileset,
} from "./graphics2d/tiled/TiledImporter";
export type {
  ParsedAnimation,
  ParsedGLTFDocument,
  ParsedNode,
  ParsedSkin,
} from "./utils/gltf/GLTFDocument";

export { default as EventEmitter, type EventMap } from "./utils/EventEmitter";

export {
  DEFAULT_LAYERS,
  LayerRegistry,
  type Layer,
  type LayerBackend,
  type LayerMember,
  type LayerSort,
  type ResolvedLayer,
} from "./runtime/Layer";

export {
  APP_NODE_KIND,
  createEntityNode,
  createUINode,
  type AppNode,
  type EntityNode,
  type UINode,
} from "./AppNode";
export {
  INSTANCE_KIND,
  isEntityInstance,
  isInstance,
  isUIInstance,
  type EntityInstance,
  type Instance,
  type InstanceKind,
  type UIInstance,
} from "./runtime/Instance";
export { Materializer, type MaterializerHooks } from "./runtime/Materializer";
export type {
  DisposeContext,
  DocumentContext,
  FeaturesContext,
  LayerContext,
  OverlayContext,
  ProjectionContext,
} from "./runtime/ProjectionContext";
export type { UIRenderer } from "./runtime/UIRenderer";

export { computed, isRef, ref, watch, type ReadonlyRef, type Ref } from "./runtime/reactive";

export {
  beginCleanupScope,
  endCleanupScope,
  hasActiveCleanupScope,
  registerCleanup,
} from "./runtime/cleanupScope";

export { enterUIScope, isInUIScope, leaveUIScope } from "./runtime/uiScope";

export {
  Animator,
  Application,
  AudioHandle,
  AudioManager,
  Camera,
  CameraFollow2D,
  Component,
  Easings,
  ErrorTracker,
  FrameProfiler,
  GameEntity,
  GLTFParser,
  InputManager,
  Light,
  Logger,
  Material,
  MeshBuilder,
  MeshRenderer,
  ModelManager,
  MouseButton,
  ParticleEmitter,
  Scene,
  Script,
  Shader,
  Skeleton,
  SkinnedMeshRenderer,
  Sprite2DRenderer,
  SpriteAnimator,
  SpriteAtlas,
  SpriteAtlasManager,
  SpriteRenderer,
  TextureManager,
  TileCollider,
  TiledImporter,
  TilemapRenderer,
  Time,
  Transform,
  Tween,
  TweenManager,
  worldToScreen,
};
