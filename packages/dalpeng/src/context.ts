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
export function requireApp(hookName: string): Application {
  if (!thisApp) throw new Error(`${hookName}() requires an active Application context (must be called inside defineApp setup).`);
  return thisApp;
}

let thisScene: Scene | null = null;
export function getThisScene() {
  return thisScene;
}
export function setThisScene(scene: Scene | null) {
  thisScene = scene;
  currentThis = scene;
}
export function requireScene(hookName: string): Scene {
  if (!thisScene) throw new Error(`${hookName}() requires an active Scene context (must be called inside defineScene setup).`);
  return thisScene;
}

let thisEntity: GameEntity | null = null;
export function getThisEntity() {
  return thisEntity;
}
export function setThisEntity(entity: GameEntity | null) {
  thisEntity = entity;
  currentThis = entity;
}
export function requireEntity(hookName: string): GameEntity {
  if (!thisEntity) throw new Error(`${hookName}() must be called inside defineGameEntity setup.`);
  return thisEntity;
}

let parentEntity: GameEntity | null = null;
export function getParentEntity() {
  return parentEntity;
}
export function setParentEntity(entity: GameEntity | null) {
  parentEntity = entity;
}

export interface UIContext {
  nodes: import("./ui/types").NodeDescriptor[];
  layout: { direction: "column" | "row"; gap: number; align?: string };
}

let thisUI: UIContext | null = null;
export function getThisUI(): UIContext | null {
  return thisUI;
}
export function setThisUI(ui: UIContext | null): void {
  thisUI = ui;
}
export function requireUI(hookName: string): UIContext {
  if (!thisUI) throw new Error(`${hookName}() requires an active UI context (must be called inside defineUI setup).`);
  return thisUI;
}

const cleanupStack: Set<() => void>[] = [];

export function beginCleanupScope(): Set<() => void> {
  const scope = new Set<() => void>();
  cleanupStack.push(scope);
  return scope;
}

export function endCleanupScope(): void {
  cleanupStack.pop();
}

export function registerCleanup(fn: () => void): void {
  const current = cleanupStack[cleanupStack.length - 1];
  if (current) {
    current.add(fn);
  }
}

export function hasActiveCleanupScope(): boolean {
  return cleanupStack.length > 0;
}
