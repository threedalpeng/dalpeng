import { describe, expect, it } from "vitest";
import Application from "../src/Application";
import Component from "../src/ecs/Component";
import GameEntity from "../src/ecs/GameEntity";
import Scene from "../src/Scene";

class TagA extends Component {}
class TagB extends Component {}
class TagC extends Component {}

function setupApp(): { app: Application; scene: Scene } {
  const app = new Application();
  const scene = new Scene();
  app.addScene(scene);
  return { app, scene };
}

function makeEntity(scene: Scene, types: Array<typeof Component>): GameEntity {
  const e = new GameEntity();
  scene.addEntity(e);
  for (const T of types) {
    e.addComponent(T as new (e: GameEntity) => Component);
  }
  return e;
}

describe("Application.query", () => {
  it("returns entities that have all requested components", () => {
    const { app, scene } = setupApp();
    const e1 = makeEntity(scene, [TagA, TagB]);
    const e2 = makeEntity(scene, [TagA]);
    const e3 = makeEntity(scene, [TagA, TagB, TagC]);

    const results = Array.from(app.query([TagA, TagB]));
    const entities = results.map(([e]) => e);
    expect(entities).toContain(e1);
    expect(entities).toContain(e3);
    expect(entities).not.toContain(e2);
  });

  it("returns typed component tuples", () => {
    const { app, scene } = setupApp();
    const e = makeEntity(scene, [TagA, TagB]);

    for (const [entity, a, b] of app.query([TagA, TagB])) {
      expect(entity).toBe(e);
      expect(a).toBeInstanceOf(TagA);
      expect(b).toBeInstanceOf(TagB);
    }
  });

  it("returns empty iterator when any type has no active components", () => {
    const { app, scene } = setupApp();
    makeEntity(scene, [TagA]);
    const results = Array.from(app.query([TagA, TagC]));
    expect(results).toEqual([]);
  });

  it("pivots on the smallest active set (regression for O(N^2) scan)", () => {
    const { app, scene } = setupApp();
    for (let i = 0; i < 100; i++) makeEntity(scene, [TagA]);
    makeEntity(scene, [TagA, TagB]);

    const results = Array.from(app.query([TagA, TagB]));
    expect(results).toHaveLength(1);
  });
});
