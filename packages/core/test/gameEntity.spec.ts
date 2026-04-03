import { describe, expect, it } from "vitest";
import GameEntity from "../src/ecs/GameEntity";
import Transform from "../src/ecs/Transform";

describe("GameEntity component cache", () => {
  it("returns cached components without scanning global registries", () => {
    const entity = new GameEntity("unit");

    const transform = entity.addComponent(Transform);
    expect(entity.getComponent(Transform)).toBe(transform);

    const transform2 = entity.addComponent(Transform);
    expect(entity.getComponents(Transform)).toEqual([transform, transform2]);
  });
});
