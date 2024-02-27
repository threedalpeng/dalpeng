import type { Application, GameEntity, Scene } from "@dalpeng/core";

let currentThis: Application | Scene | GameEntity | null = null;
export function getThis() {
  return currentThis;
}

let thisApp: Application | null = null;
export function getThisApp() {
  return thisApp;
}
export function setThisApp(app: Application | null) {
  thisApp = app;
  currentThis = app;
}

let thisScene: Scene | null = null;
export function getThisScene() {
  return thisScene;
}
export function setThisScene(scene: Scene | null) {
  thisScene = scene;
  currentThis = scene;
}

let thisEntity: GameEntity | null = null;
export function getThisEntity() {
  return thisEntity;
}
export function setThisEntity(entity: GameEntity | null) {
  thisEntity = entity;
  currentThis = entity;
}
