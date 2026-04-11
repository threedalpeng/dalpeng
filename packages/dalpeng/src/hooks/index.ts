import { getThis } from "../context";

export * from "./app";
export * from "./gameEntity";
export * from "./scene";
export * from "./tween";
export * from "./audio";
export * from "./input";
export * from "./texture";
export * from "./model";
export * from "./sprite2d";
export * from "./tilemap";
export * from "./camera2d";
export * from "./event";
export * from "./triggerZone";
export * from "./sceneTransition";
export * from "./dialogue";

export function withName(name: string) {
  const current = getThis();
  if (!current) {
    throw new Error("withName() must be called inside defineApp/defineScene/defineGameEntity setup.");
  }
  current.name = name;
}
