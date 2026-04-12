/**
 * Materializer unit tests (M-RUNTIME-1 PR 2 Phase B).
 *
 * The Materializer is tested in isolation here — no real Application,
 * no real GameEntity, no real DOM. We construct it with mock hooks +
 * mock UI renderer and verify:
 *
 *   - descriptor → instance walk produces the expected graph shape
 *   - cross-kind composition (game parent + ui child) materialises
 *   - destroy cascade walks DFS, detaches UI children, calls onDestroy
 *   - idempotent UI detach (cascade can call detach multiple times)
 *
 * The real wiring (Application calls Materializer with real hooks) is
 * tested in PR 3 demo regression.
 */

import { describe, expect, it, vi } from "vitest";
import type Application from "../src/Application";
import type Scene from "../src/Scene";
import type GameEntity from "../src/ecs/GameEntity";
import {
  Materializer,
  type MaterializerHooks,
  type ProjectionContext,
  type UIRenderer,
} from "../src/index";
import { createEntityNode, createUINode } from "../src/runtime/Descriptor";
import {
  isEntityInstance,
  isUIInstance,
  type EntityInstance,
  type UIInstance,
} from "../src/runtime/Instance";

// ─────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────

function makeMockEntity(id: number): GameEntity {
  return { id, _isMockEntity: true } as unknown as GameEntity;
}

function makeMockScene(): Scene {
  return { _isMockScene: true } as unknown as Scene;
}

function makeMockApp(renderer: UIRenderer | null): Application {
  return {
    getUIRenderer: () => renderer,
  } as unknown as Application;
}

// We need the real `INSTANCE_KIND` symbol so type guards work, since
// the renderer is what stamps brand on the returned object.
import { INSTANCE_KIND } from "../src/runtime/Instance";

function makeRealUIRenderer(
  trackDetach?: (id: string) => void
): UIRenderer & { instances: UIInstance[] } {
  const instances: UIInstance[] = [];
  let counter = 0;
  const renderer: UIRenderer & { instances: UIInstance[] } = {
    instances,
    materialize(descriptor, _context, owner) {
      const id = `ui-${counter++}`;
      let detached = false;
      const instance: UIInstance = {
        [INSTANCE_KIND]: "ui",
        descriptor,
        owner,
        rendererState: { id },
        detach() {
          if (detached) return;
          detached = true;
          trackDetach?.(id);
        },
      };
      instances.push(instance);
      return instance;
    },
  };
  return renderer;
}

function makeHooks(
  options: {
    onCreateEntity?: (entity: GameEntity, parent: EntityInstance | Scene) => void;
    onPushContext?: (entity: GameEntity) => void;
    onPopContext?: (entity: GameEntity) => void;
  } = {}
): MaterializerHooks {
  let nextId = 0;
  return {
    createGameEntity(parent) {
      const e = makeMockEntity(nextId++);
      options.onCreateEntity?.(e, parent);
      return e;
    },
    pushGameContext(entity) {
      options.onPushContext?.(entity);
      return () => options.onPopContext?.(entity);
    },
    buildProjectionContext(_owner) {
      return {} as ProjectionContext;
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────

describe("Materializer — descriptor walk", () => {
  it("materialises a single game descriptor", () => {
    const renderer = makeRealUIRenderer();
    const app = makeMockApp(renderer);
    const m = new Materializer(app, makeHooks());
    const scene = makeMockScene();

    const desc = createEntityNode(() => undefined, {});
    const instance = m.materialize(desc, scene);

    expect(isEntityInstance(instance)).toBe(true);
    if (isEntityInstance(instance)) {
      expect(instance.descriptor).toBe(desc);
      expect(instance.owner).toBe(scene);
      expect(instance.gameChildren).toEqual([]);
      expect(instance.uiChildren).toEqual([]);
    }
  });

  it("materialises nested game children recursively", () => {
    const renderer = makeRealUIRenderer();
    const app = makeMockApp(renderer);
    const m = new Materializer(app, makeHooks());
    const scene = makeMockScene();

    const child = createEntityNode(() => undefined, {});
    const parent = createEntityNode(() => [child], {});

    const instance = m.materialize(parent, scene) as EntityInstance;
    expect(instance.gameChildren).toHaveLength(1);
    expect(instance.gameChildren[0].descriptor).toBe(child);
    expect(instance.gameChildren[0].owner).toBe(instance);
  });

  it("materialises a ui child of a game parent (cross-kind)", () => {
    const renderer = makeRealUIRenderer();
    const app = makeMockApp(renderer);
    const m = new Materializer(app, makeHooks());
    const scene = makeMockScene();

    const uiChild = createUINode(() => [], {});
    const gameParent = createEntityNode(() => [uiChild], {});

    const instance = m.materialize(gameParent, scene) as EntityInstance;

    expect(instance.gameChildren).toEqual([]);
    expect(instance.uiChildren).toHaveLength(1);
    expect(isUIInstance(instance.uiChildren[0])).toBe(true);
    expect(instance.uiChildren[0].descriptor).toBe(uiChild);
    expect(instance.uiChildren[0].owner).toBe(instance);
  });

  it("materialises a mixed children list (game + ui)", () => {
    const renderer = makeRealUIRenderer();
    const app = makeMockApp(renderer);
    const m = new Materializer(app, makeHooks());
    const scene = makeMockScene();

    const gameChild = createEntityNode(() => undefined, {});
    const uiChild = createUINode(() => [], {});
    const parent = createEntityNode(() => [gameChild, uiChild], {});

    const instance = m.materialize(parent, scene) as EntityInstance;
    expect(instance.gameChildren).toHaveLength(1);
    expect(instance.uiChildren).toHaveLength(1);
  });

  it("calls setup with the props captured at descriptor creation", () => {
    const renderer = makeRealUIRenderer();
    const app = makeMockApp(renderer);
    const m = new Materializer(app, makeHooks());
    const scene = makeMockScene();

    const setup = vi.fn(() => undefined);
    const desc = createEntityNode(setup, { hp: 100, name: "Enemy" });
    m.materialize(desc, scene);

    expect(setup).toHaveBeenCalledOnce();
    expect(setup).toHaveBeenCalledWith({ hp: 100, name: "Enemy" });
  });

  it("pushes and pops the entity context around setup", () => {
    const events: string[] = [];
    const renderer = makeRealUIRenderer();
    const app = makeMockApp(renderer);
    const m = new Materializer(
      app,
      makeHooks({
        onPushContext: (e) => events.push(`push ${e.id}`),
        onPopContext: (e) => events.push(`pop ${e.id}`),
      })
    );
    const scene = makeMockScene();

    const desc = createEntityNode(() => {
      events.push("setup runs");
      return undefined;
    }, {});

    m.materialize(desc, scene);

    expect(events).toEqual(["push 0", "setup runs", "pop 0"]);
  });

  it("throws when materialising a UI descriptor without a registered renderer", () => {
    const app = makeMockApp(null);
    const m = new Materializer(app, makeHooks());
    const scene = makeMockScene();

    const desc = createUINode(() => [], {});
    expect(() => m.materialize(desc, scene)).toThrow(/no UI renderer registered/);
  });
});

describe("Materializer — materializeRoots", () => {
  it("splits root descriptors into game and ui buckets", () => {
    const renderer = makeRealUIRenderer();
    const app = makeMockApp(renderer);
    const m = new Materializer(app, makeHooks());
    const scene = makeMockScene();

    const game1 = createEntityNode(() => undefined, {});
    const game2 = createEntityNode(() => undefined, {});
    const ui1 = createUINode(() => [], {});

    const result = m.materializeRoots(scene, [game1, ui1, game2]);

    expect(result.gameInstances).toHaveLength(2);
    expect(result.uiInstances).toHaveLength(1);
    expect(result.gameInstances[0].descriptor).toBe(game1);
    expect(result.gameInstances[1].descriptor).toBe(game2);
    expect(result.uiInstances[0].descriptor).toBe(ui1);
  });
});

describe("Materializer — destroyCascade", () => {
  it("walks DFS and detaches UI children before running onDestroy", () => {
    const detached: string[] = [];
    const onDestroyOrder: number[] = [];
    const renderer = makeRealUIRenderer((id) => detached.push(id));
    const app = makeMockApp(renderer);
    const m = new Materializer(app, makeHooks());
    const scene = makeMockScene();

    // Tree:
    //   parent
    //    ├── ui-A
    //    └── child
    //         └── ui-B
    const uiA = createUINode(() => [], {});
    const uiB = createUINode(() => [], {});
    const child = createEntityNode(() => [uiB], {});
    const parent = createEntityNode(() => [uiA, child], {});

    const instance = m.materialize(parent, scene) as EntityInstance;
    expect(detached).toEqual([]); // nothing torn down yet

    m.destroyCascade(instance, (entity) => {
      onDestroyOrder.push(entity.id);
    });

    // child's UI (ui-1) detaches first (DFS — child subtree first)
    // then child entity onDestroy
    // then parent's UI (ui-0)
    // then parent entity onDestroy
    expect(detached).toEqual(["ui-1", "ui-0"]);
    // entity ids: parent = 0, ui-0 = (renderer counter), child = 1
    // The order of `onDestroy` calls is child-first, parent-last.
    expect(onDestroyOrder).toHaveLength(2);
    // Last entity to onDestroy is the root (parent).
    expect(onDestroyOrder[onDestroyOrder.length - 1]).toBe(instance.entity.id);
  });

  it("idempotent UI detach — second cascade is a no-op", () => {
    const detached: string[] = [];
    const renderer = makeRealUIRenderer((id) => detached.push(id));
    const app = makeMockApp(renderer);
    const m = new Materializer(app, makeHooks());
    const scene = makeMockScene();

    const uiChild = createUINode(() => [], {});
    const parent = createEntityNode(() => [uiChild], {});
    const instance = m.materialize(parent, scene) as EntityInstance;

    // Grab the instance reference before cascade clears the list.
    const ui = instance.uiChildren[0];

    m.destroyCascade(instance, () => {});
    expect(detached).toEqual(["ui-0"]);

    // Manually call detach again — second call must be a no-op.
    ui.detach();
    expect(detached).toEqual(["ui-0"]); // unchanged
  });
});
