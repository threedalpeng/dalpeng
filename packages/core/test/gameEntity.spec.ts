import { describe, expect, it, vi } from "vitest";
import Component from "../src/ecs/Component";
import GameEntity from "../src/ecs/GameEntity";
import Transform from "../src/ecs/Transform";

describe("Component identity is minification-safe (constructor-ref keyed)", () => {
  it("two distinct classes with the same runtime name stay separated", () => {
    // Simulates what a minifier can produce: two class declarations whose
    // `.name` string collapses to the same value. With class-name-string
    // keying the two would overwrite each other in the global registry.
    const makeA = () =>
      class extends Component {
        marker = "A";
      };
    const makeB = () =>
      class extends Component {
        marker = "B";
      };
    const A = makeA();
    const B = makeB();
    const entity = new GameEntity();
    const a = entity.addComponent(A);
    const b = entity.addComponent(B);
    expect(entity.getComponent(A)).toBe(a);
    expect(entity.getComponent(B)).toBe(b);
    expect(entity.getComponent(A)).not.toBe(b);
  });
});

describe("GameEntity component cache", () => {
  it("returns cached components without scanning global registries", () => {
    const entity = new GameEntity("unit");

    const transform = entity.addComponent(Transform);
    expect(entity.getComponent(Transform)).toBe(transform);

    const transform2 = entity.addComponent(Transform);
    expect(entity.getComponents(Transform)).toEqual([transform, transform2]);
  });
});

describe("GameEntity.remove disposes components", () => {
  it("calls dispose() on every component", () => {
    const disposed = vi.fn();
    class DisposableComponent extends Component {
      override dispose(): void {
        disposed();
      }
    }
    const entity = new GameEntity("disposable");
    entity.addComponent(DisposableComponent);
    entity.addComponent(DisposableComponent);
    entity.remove();
    expect(disposed).toHaveBeenCalledTimes(2);
  });

  it("swallows errors thrown from dispose() and continues", () => {
    const good = vi.fn();
    class Bad extends Component {
      override dispose(): void {
        throw new Error("intentional");
      }
    }
    class Good extends Component {
      override dispose(): void {
        good();
      }
    }
    const entity = new GameEntity("mixed");
    entity.addComponent(Bad);
    entity.addComponent(Good);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    entity.remove();
    expect(good).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
