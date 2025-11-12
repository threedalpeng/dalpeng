import { Application, GameEntity, Scene } from "@dalpeng/core";
import type { UseApp } from "./hooks/app";

function createApp(useApp: UseApp) {
  const app = useApp();
  app.start();
  return app;
}

export {
  Camera,
  Input,
  Light,
  MeshBuilder,
  MeshRenderer,
  Script,
  Shader,
  SpriteRenderer,
  Time,
  Transform,
} from "@dalpeng/core";
export { runApp, withCanvasOptions } from "./hooks/app";
export { enableDebugOverlay, enablePostToneMappingToggle } from "./hooks/dev";
export * from "./hooks/index";
export { createApp, type Application, type GameEntity, type Scene };
