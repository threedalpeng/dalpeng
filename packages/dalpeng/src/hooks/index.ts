import { getThis } from "./context";

export * from "./app";
export * from "./gameEntity";
export * from "./scene";

export function withName(name: string) {
  const thisScene = getThis();
  if (thisScene === null) return;
  thisScene.name = name;
}
