import { Application, GameEntity, Scene } from "@dalpeng/core";
export { vec2, vec3, vec4 } from "@dalpeng/math";

export {
  Animator,
  AudioHandle,
  AudioManager,
  Camera,
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
  SpriteRenderer,
  Time,
  Transform,
  Tween,
  TweenManager,
} from "@dalpeng/core";

// ECS + Resource hooks
export { runApp, withCanvasOptions, withFeatures, type AppRunOptions } from "./hooks/app";
export * from "./hooks/index";

// Reactive
export { ref, watch, isRef, type Ref } from "./reactive";

// UI System
export {
  defineUI,
  defineText,
  defineBar,
  defineHtml,
  defineToggle,
  defineRange,
  defineSelect,
  defineButton,
  defineValue,
  useLayout,
  useFeature,
} from "./ui/define";
export type { UITemplate, UIHandle, NodeDescriptor, SlotPosition } from "./ui/types";
export { mountOverlay } from "./ui/mount";
export {
  defineControlGroup,
  type ControlGroup,
  LIGHTING_VIEWS_GROUP,
  TONE_MAPPING_GROUP,
  SHADOWS_GROUP,
  BLOOM_GROUP,
  IBL_GROUP,
  SSAO_GROUP,
  FXAA_GROUP,
  ANIMATION_GROUP,
  ALL_RENDER_GROUPS,
} from "./ui/controlGroups";

// Debug
export { enableDebugPanel, type DebugPanelHandle, type DebugView } from "./debug/panel";

export { type Application, type GameEntity, type Scene };
