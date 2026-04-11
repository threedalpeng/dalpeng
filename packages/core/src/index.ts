import Application from "./Application";
import Component from "./ecs/Component";
import GameEntity from "./ecs/GameEntity";
import Camera from "./graphics/Camera";
import Light from "./graphics/Light";
import Material from "./graphics/Material";
import MeshRenderer from "./graphics/MeshRenderer";
import Shader from "./graphics/Shader";
import SpriteRenderer from "./graphics/SpriteRenderer";
import InputManager, { MouseButton } from "./InputManager";
import Scene from "./Scene";
import Script from "./ecs/Script";
import Time from "./Time";
import Transform from "./ecs/Transform";
import MeshBuilder from "./utils/mesh";
import Tween from "./animation/Tween";
import TweenManager from "./animation/TweenManager";
import { Easings } from "./animation/easings";
import SkinnedMeshRenderer from "./graphics/SkinnedMeshRenderer";
import Skeleton from "./animation/Skeleton";
import Animator from "./animation/Animator";
import AudioManager from "./audio/AudioManager";
import AudioHandle from "./audio/AudioHandle";
import TextureManager from "./asset/TextureManager";
import ModelManager from "./asset/ModelManager";
import SpriteAtlasManager from "./asset/SpriteAtlasManager";
import { GLTFParser } from "./utils/gltf/GLTFParser";
import ParticleEmitter from "./graphics/ParticleEmitter";
import { Logger, FrameProfiler, ErrorTracker } from "./debug";
import { worldToScreen } from "./utils/worldToScreen";
import SpriteAtlas from "./graphics2d/SpriteAtlas";
import Sprite2DRenderer from "./graphics2d/Sprite2DRenderer";
import SpriteAnimator from "./graphics2d/SpriteAnimator";
import TilemapRenderer from "./graphics2d/TilemapRenderer";
import TileCollider from "./graphics2d/TileCollider";
import TiledImporter from "./graphics2d/tiled/TiledImporter";
import CameraFollow2D from "./graphics2d/CameraFollow2D";
export type { CanvasOptions } from "./CanvasOptions";
export type { RenderConfig } from "./RenderConfig";
export type { TweenOptions } from "./animation/Tween";
export type { PlayOptions } from "./audio/AudioManager";
export type { TextureLoadOptions } from "./asset/TextureManager";
export type { ModelAsset, GPUMesh, GPUPrimitive } from "./asset/ModelManager";
export type { ParsedGLTFDocument, ParsedNode } from "./utils/gltf/GLTFDocument";
export type { ParsedSkin, ParsedAnimation } from "./utils/gltf/GLTFDocument";
export type { ParticleEmitterConfig } from "./graphics/ParticleEmitter";
export type { LogLevel, LogModule, LogEntry } from "./debug";
export type { PassTiming, FrameStats } from "./debug";
export type { GLError, Toast } from "./debug";
export type { FrameStatsSummary } from "./Application";
export type { AtlasFrame } from "./graphics2d/SpriteAtlas";
export type { SpriteAnimationClip } from "./graphics2d/SpriteAnimationClip";
export type { TilemapLayerBatch } from "./graphics2d/TilemapRenderer";
export type { TriggerZone } from "./graphics2d/TriggerZone";
export type {
  ParsedTiledMap,
  ParsedTileset,
  ParsedTileLayer,
  ParsedObjectLayer,
} from "./graphics2d/tiled/TiledImporter";

export { default as EventEmitter, type EventMap } from "./utils/EventEmitter";

export {
  LayerRegistry,
  DEFAULT_LAYERS,
  type Layer,
  type LayerBackend,
  type LayerSort,
  type LayerMember,
  type ResolvedLayer,
} from "./runtime/Layer";

export {
  DESCRIPTOR_KIND,
  isDescriptor,
  isGameDescriptor,
  isUIDescriptor,
  createGameDescriptor,
  createUIDescriptor,
  type Descriptor,
  type DescriptorKind,
  type GameDescriptor,
  type UIDescriptor,
  type LogicalDescriptor,
} from "./runtime/Descriptor";
export {
  INSTANCE_KIND,
  isInstance,
  isGameInstance,
  isUIInstance,
  type Instance,
  type InstanceKind,
  type GameInstance,
  type UIInstance,
} from "./runtime/Instance";
export type {
  DocumentContext,
  OverlayContext,
  FeaturesContext,
  LayerContext,
  DisposeContext,
  ProjectionContext,
} from "./runtime/ProjectionContext";
export type { UIRenderer } from "./runtime/UIRenderer";
export {
  Materializer,
  type MaterializerHooks,
} from "./runtime/Materializer";

export {
  ref,
  computed,
  watch,
  isRef,
  type Ref,
  type ReadonlyRef,
} from "./runtime/reactive";

export {
  beginCleanupScope,
  endCleanupScope,
  registerCleanup,
  hasActiveCleanupScope,
} from "./runtime/cleanupScope";

export {
  enterUIScope,
  leaveUIScope,
  isInUIScope,
} from "./runtime/uiScope";

export {
  Application,
  Animator,
  AudioHandle,
  AudioManager,
  Camera,
  CameraFollow2D,
  Component,
  Easings,
  ErrorTracker,
  FrameProfiler,
  GameEntity,
  InputManager,
  Light,
  Logger,
  Material,
  MeshBuilder,
  MeshRenderer,
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
  TileCollider,
  TiledImporter,
  TilemapRenderer,
  TextureManager,
  ModelManager,
  GLTFParser,
  Time,
  Transform,
  Tween,
  TweenManager,
  worldToScreen,
};
