import { describe, expect, it } from "vitest";
import { vec3 } from "@dalpeng/math";
import Scene from "../src/Scene";
import GameEntity from "../src/entity/GameEntity";
import Transform from "../src/Transform";

describe("Scene helpers", () => {
  it("tracks tags across hierarchies and updates on change", () => {
    const scene = new Scene();
    const parent = new GameEntity("parent");
    parent.tag = "player";
    const child = new GameEntity("child");
    child.tag = "enemy";
    parent.addChild(child);

    scene.addEntity(parent);

    expect(scene.findByTag("player")).toContain(parent);
    expect(scene.findByTag("enemy")).toContain(child);

    child.tag = "boss";
    expect(scene.findByTag("enemy")).toHaveLength(0);
    expect(scene.findByTag("boss")).toContain(child);

    child.detach();
    expect(scene.findByTag("boss")).toHaveLength(0);
  });

  it("queryRadius returns entities within the given distance", () => {
    const scene = new Scene();
    const root = new GameEntity("root");
    const rootTransform = root.addComponent(Transform);
    rootTransform.position = vec3(0, 0, 0);

    const child = new GameEntity("child");
    const childTransform = child.addComponent(Transform);
    childTransform.position = vec3(0, 0, 3);
    root.addChild(child);

    scene.addEntity(root);
    rootTransform.checkModelMatrixToBeUpdated();
    childTransform.checkModelMatrixToBeUpdated();
    childTransform.worldPosition.x = 0;
    childTransform.worldPosition.y = 0;
    childTransform.worldPosition.z = 3;

    const close = scene.queryRadius(vec3(0, 0, 0), 1);
    expect(close).toContain(root);
    expect(close).not.toContain(child);

    const farther = scene.queryRadius(vec3(0, 0, 0), 5);
    expect(farther).toContain(child);
  });
});
