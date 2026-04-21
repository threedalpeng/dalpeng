/**
 * Philosophy invariants — fine-grained reactivity + lifecycle contracts.
 *
 * These tests lock down claims dalpeng makes in design docs:
 *
 *   1. defineEntity setup runs EXACTLY ONCE per entity (no VDOM re-render).
 *   2. A ref change only notifies subscribers of THAT ref (binding
 *      precision — no "dirty subtree" rebuild).
 *   3. Entity destroy propagates through children and UI (cascade).
 *
 * Each invariant is a *claim in the design docs*. Breaking them silently
 * would mean dalpeng stops being the engine it says it is.
 */
import { describe, expect, it } from "vitest";
import { createEntityNode, createUINode } from "../src/runtime/Descriptor";
import { batch, computed, ref } from "../src/runtime/reactive";
import { testScene } from "../src/testing/testScene";

describe("Philosophy invariant — setup runs exactly once", () => {
  it("defineEntity setup body runs once even after many frames + state changes", () => {
    let setupCount = 0;
    const state = ref(0);

    const root = createEntityNode(() => {
      setupCount++;
      // Read the ref inside setup — would cause re-run under VDOM model.
      void state.value;
      return [];
    }, undefined);

    const runner = testScene([root]);
    expect(setupCount).toBe(1);

    for (let i = 0; i < 10; i++) {
      state.value = i + 1;
      runner.step(1);
    }
    expect(setupCount).toBe(1);

    runner.destroy();
  });

  it("UI descriptor setup also runs once", () => {
    let setupCount = 0;
    const state = ref(0);

    const ui = createUINode(() => {
      setupCount++;
      void state.value;
      return [];
    }, undefined);

    const root = createEntityNode(() => [ui], undefined);
    const runner = testScene([root]);
    expect(setupCount).toBe(1);

    state.value = 1;
    state.value = 2;
    runner.step(2);
    expect(setupCount).toBe(1);

    runner.destroy();
  });
});

describe("Philosophy invariant — ref binding precision", () => {
  it("writing to ref A does not notify subscribers of ref B", () => {
    const a = ref(0);
    const b = ref(0);
    let aCalls = 0;
    let bCalls = 0;
    a.subscribe(() => aCalls++);
    b.subscribe(() => bCalls++);

    a.value = 1;
    expect(aCalls).toBe(1);
    expect(bCalls).toBe(0);

    b.value = 1;
    expect(aCalls).toBe(1);
    expect(bCalls).toBe(1);
  });

  it("writing the same value does NOT fire subscribers (Object.is dedupe)", () => {
    // Current behaviour: `set value(newVal) { if (newVal === oldVal) return; }`.
    // This is aligned with fine-grained reactivity — avoid redundant updates.
    // If this changes (e.g. switched to structural equality) the invariant
    // document must be updated explicitly, not stumbled into.
    const r = ref(5);
    let calls = 0;
    r.subscribe(() => calls++);
    r.value = 5;
    expect(calls).toBe(0);
    r.value = 6;
    expect(calls).toBe(1);
  });
});

describe("Philosophy invariant — batch() collapses writes", () => {
  it("N writes to the same ref inside batch fires subscriber once with final value", () => {
    const r = ref(0);
    let calls = 0;
    let seenNew: number | null = null;
    let seenOld: number | null = null;
    r.subscribe((n, o) => {
      calls++;
      seenNew = n;
      seenOld = o;
    });

    batch(() => {
      r.value = 1;
      r.value = 2;
      r.value = 3;
    });

    expect(calls).toBe(1);
    expect(seenNew).toBe(3);
    expect(seenOld).toBe(0); // pre-batch value preserved
  });

  it("writes to distinct refs inside batch each fire once", () => {
    const a = ref(0);
    const b = ref(0);
    let aCalls = 0;
    let bCalls = 0;
    a.subscribe(() => aCalls++);
    b.subscribe(() => bCalls++);

    batch(() => {
      a.value = 1;
      b.value = 1;
      a.value = 2;
    });

    expect(aCalls).toBe(1);
    expect(bCalls).toBe(1);
  });

  it("write-then-revert inside batch fires nothing", () => {
    const r = ref(5);
    let calls = 0;
    r.subscribe(() => calls++);

    batch(() => {
      r.value = 10;
      r.value = 5; // back to pre-batch
    });

    expect(calls).toBe(0);
  });

  it("nested batch flushes at outermost close only", () => {
    const r = ref(0);
    let calls = 0;
    r.subscribe(() => calls++);

    batch(() => {
      r.value = 1;
      batch(() => {
        r.value = 2;
        expect(calls).toBe(0); // still pending
      });
      expect(calls).toBe(0); // still pending — inner close did not flush
      r.value = 3;
    });

    expect(calls).toBe(1); // collapsed to one fire at outermost close
  });

  it("sync write outside batch still fires immediately (unchanged path)", () => {
    const r = ref(0);
    let calls = 0;
    r.subscribe(() => calls++);

    r.value = 1;
    r.value = 2;
    expect(calls).toBe(2);
  });

  it("throw inside batch still drains the queue", () => {
    const r = ref(0);
    let calls = 0;
    r.subscribe(() => calls++);

    expect(() =>
      batch(() => {
        r.value = 1;
        throw new Error("boom");
      })
    ).toThrow("boom");

    expect(calls).toBe(1);
    expect(r.value).toBe(1);
  });

  it("computed over batched refs re-evaluates on read inside batch", () => {
    const a = ref(1);
    const b = ref(2);
    const sum = computed(() => a.value + b.value);
    expect(sum.value).toBe(3);

    batch(() => {
      a.value = 10;
      b.value = 20;
      // Computed reads during batch see current ref values (not stale snapshot).
      expect(sum.value).toBe(30);
    });
  });
});

describe("Philosophy invariant — Component.on returns unsubscribe", () => {
  it("returned unsub stops future fires", async () => {
    const { default: Component } = await import("../src/ecs/Component");
    const { default: GameEntity } = await import("../src/ecs/GameEntity");

    class TestComp extends Component {}
    const entity = new GameEntity();
    const comp = entity.addComponent(TestComp);

    let calls = 0;
    const unsub = comp.on("ping", () => calls++);

    comp.emit("ping");
    expect(calls).toBe(1);
    comp.emit("ping");
    expect(calls).toBe(2);

    unsub();
    comp.emit("ping");
    expect(calls).toBe(2);
  });

  it("once() fires exactly once then auto-unsubscribes", async () => {
    const { default: Component } = await import("../src/ecs/Component");
    const { default: GameEntity } = await import("../src/ecs/GameEntity");

    class TestComp extends Component {}
    const entity = new GameEntity();
    const comp = entity.addComponent(TestComp);

    let calls = 0;
    comp.once("poke", () => calls++);
    comp.emit("poke");
    comp.emit("poke");
    comp.emit("poke");
    expect(calls).toBe(1);
  });
});

describe("Philosophy invariant — scope stack supports nesting", () => {
  it("nested pushScope frames restore outer state when popped", async () => {
    const { pushScope, findScope } = await import("../src/runtime/scope");
    const { default: GameEntity } = await import("../src/ecs/GameEntity");

    expect(findScope("entity")).toBeNull();

    const outerEntity = new GameEntity();
    const innerEntity = new GameEntity();

    const popOuter = pushScope({
      kind: "entity",
      entity: outerEntity,
      parent: null,
      cleanups: new Set(),
    });
    expect(findScope("entity")?.entity).toBe(outerEntity);

    const popInner = pushScope({
      kind: "entity",
      entity: innerEntity,
      parent: outerEntity,
      cleanups: new Set(),
    });
    expect(findScope("entity")?.entity).toBe(innerEntity);

    popInner();
    expect(findScope("entity")?.entity).toBe(outerEntity);

    popOuter();
    expect(findScope("entity")).toBeNull();
  });

  it("UI scope and entity scope coexist on the same unified stack", async () => {
    const { pushScope, findScope, hasScope } = await import("../src/runtime/scope");
    const { default: GameEntity } = await import("../src/ecs/GameEntity");

    expect(hasScope("ui")).toBe(false);
    expect(hasScope("entity")).toBe(false);

    const entity = new GameEntity();
    const popEntity = pushScope({
      kind: "entity",
      entity,
      parent: null,
      cleanups: new Set(),
    });

    expect(hasScope("entity")).toBe(true);
    expect(hasScope("ui")).toBe(false);
    expect(findScope("entity")?.entity).toBe(entity);

    const popUI = pushScope({ kind: "ui", ui: { kind: "ui-payload" }, cleanups: new Set() });
    expect(hasScope("ui")).toBe(true);
    expect(hasScope("entity")).toBe(true); // outer entity still reachable
    expect((findScope("ui")?.ui as { kind: string }).kind).toBe("ui-payload");
    expect(findScope("entity")?.entity).toBe(entity);

    popUI();
    expect(hasScope("ui")).toBe(false);
    expect(hasScope("entity")).toBe(true);

    popEntity();
    expect(hasScope("entity")).toBe(false);
  });

  it("registerCleanup lands on the innermost frame regardless of kind", async () => {
    const { pushScope, registerCleanup } = await import("../src/runtime/scope");
    const { default: GameEntity } = await import("../src/ecs/GameEntity");
    const entityCleanups = new Set<() => void>();
    const uiCleanups = new Set<() => void>();

    const popEntity = pushScope({
      kind: "entity",
      entity: new GameEntity(),
      parent: null,
      cleanups: entityCleanups,
    });

    registerCleanup(() => void 0);
    expect(entityCleanups.size).toBe(1);
    expect(uiCleanups.size).toBe(0);

    const popUI = pushScope({ kind: "ui", ui: null, cleanups: uiCleanups });
    registerCleanup(() => void 0);
    expect(entityCleanups.size).toBe(1); // no change
    expect(uiCleanups.size).toBe(1);

    popUI();
    popEntity();
  });
});

describe("Philosophy invariant — destroy cascade", () => {
  it("destroying an entity cascades to child entities", () => {
    const destroyOrder: string[] = [];

    const child = createEntityNode(() => {
      // Use materializer's lifecycle? We rely on GameEntity.remove for
      // now — scripts are tested in other specs. Record via dispose path.
      return [];
    }, undefined);

    const parent = createEntityNode(() => [child], undefined);
    const runner = testScene([parent]);

    const parentEntity = runner.scene.findByName("");
    expect(parentEntity).not.toBeNull();

    const beforeCount = runner.scene.entitiesRef.value.length;
    expect(beforeCount).toBeGreaterThanOrEqual(2); // parent + child

    runner.app.destroy(parentEntity!);
    runner.step(1);

    const afterCount = runner.scene.entitiesRef.value.length;
    expect(afterCount).toBe(0);

    // destroyOrder assertions would require Script-level hooks; covered by
    // materializer.spec.ts. This test asserts the structural invariant.
    void destroyOrder;
    runner.destroy();
  });
});
