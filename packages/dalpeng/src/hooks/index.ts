import { getThis } from "../context";

export * from "./app";
export * from "./audio";
export * from "./camera2d";
export * from "./dialogue";
export * from "./event";
export * from "./gameEntity";
export * from "./input";
export * from "./model";
export * from "./scene";
export * from "./sceneTransition";
export * from "./sprite2d";
export * from "./texture";
export * from "./tilemap";
export * from "./triggerZone";
export * from "./tween";

export function withName(name: string) {
  const current = getThis();
  if (!current) {
    throw new Error(
      "withName() must be called inside defineApp/defineScene/defineGameEntity setup."
    );
  }
  current.name = name;
}
