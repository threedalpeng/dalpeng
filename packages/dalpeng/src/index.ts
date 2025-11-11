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
  SpriteRenderer,
  Shader,
  Script,
  Time,
  Transform,
} from "@dalpeng/core";
export * from "./hooks/index";
export { type Application, type GameEntity, type Scene, createApp };
export { withCanvasOptions, runApp } from "./hooks/app";
