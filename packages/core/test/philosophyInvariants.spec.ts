import { describe, expect, it, vi } from "vitest";
import { createEntityNode, createUINode } from "../src/runtime/Descriptor";
import { batch, computed, ref } from "../src/runtime/flow";
import { watch } from "../src/runtime/pipeline";
import { flushSync } from "../src/runtime/unsafe";
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

describe("Philosophy invariant — topological fire", () => {
  it("chained computed fires subscribers in dep→derivative order regardless of subscribe order", () => {
    const a = ref(1);
    const b = computed(() => a.value * 2);
    const c = computed(() => b.value * 10);

    const order: string[] = [];
    // Subscribe c FIRST — without topological ordering, sync cascade would
    // fire c's subscriber before b's. Topological must correct this.
    watch(c, (v) => order.push(`c:${v}`));
    watch(b, (v) => order.push(`b:${v}`));

    batch(() => {
      a.value = 5;
    });

    expect(order).toEqual(["b:10", "c:100"]);
  });

  it("fan-in: two refs feeding one computed fires its subscriber once per batch", () => {
    const a = ref(1);
    const b = ref(2);
    const sum = computed(() => a.value + b.value);

    let fires = 0;
    watch(sum, () => fires++);

    batch(() => {
      a.value = 10;
      b.value = 20;
    });

    expect(fires).toBe(1);
    expect(sum.value).toBe(30);
  });
});

describe("Philosophy invariant — flushSync drains immediately", () => {
  it("writes inside flushSync fire subscribers synchronously", () => {
    const r = ref(0);
    let calls = 0;
    let seen = -1;
    r.subscribe((v) => {
      calls++;
      seen = v;
    });

    flushSync(() => {
      r.value = 42;
      // By the time we're at this line the subscriber has already fired.
      expect(calls).toBe(1);
      expect(seen).toBe(42);
    });
  });

  it("flushSync inside batch drains pending before bypassing", () => {
    const r = ref(0);
    const fires: number[] = [];
    r.subscribe((v) => fires.push(v));

    batch(() => {
      r.value = 1; // pending
      flushSync(() => {
        // Draining happens before fn runs; fires should contain 1.
        expect(fires).toEqual([1]);
        r.value = 2; // sync path — fires immediately
      });
      expect(fires).toEqual([1, 2]);
      r.value = 3; // back to batch pending
    });

    expect(fires).toEqual([1, 2, 3]);
  });
});

describe("Philosophy invariant — cascade depth guard", () => {
  it("aborts infinite subscriber cascade with a warning instead of hanging", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const a = ref(0);
    const b = ref(0);
    // Infinite loop: a subscriber writes b, b subscriber writes a.
    a.subscribe((v) => {
      b.value = v + 1;
    });
    b.subscribe((v) => {
      a.value = v + 1;
    });

    batch(() => {
      a.value = 1;
    });

    // Cascade must have aborted within the depth cap (8) — not hang.
    // Exact final values are implementation-defined post-abort; the important
    // claim is: the warning fired and the test completed.
    expect(warn).toHaveBeenCalled();
    const [msg] = warn.mock.calls[0];
    expect(String(msg)).toContain("cascade depth exceeded");
    warn.mockRestore();
  });
});

describe("Philosophy invariant — pipeline builder", () => {
  it("map + effect — transforms values before callback", () => {
    const r = ref(1);
    const seen: number[] = [];
    watch(r)
      .map((v) => v * 10)
      .effect((v) => seen.push(v));

    r.value = 2;
    r.value = 3;
    expect(seen).toEqual([20, 30]);
  });

  it("filter — skips values that fail predicate", () => {
    const r = ref(0);
    const seen: number[] = [];
    watch(r)
      .filter((v) => v % 2 === 0)
      .effect((v) => seen.push(v));

    r.value = 1;
    r.value = 2;
    r.value = 3;
    r.value = 4;
    expect(seen).toEqual([2, 4]);
  });

  it("distinct — collapses consecutive duplicates", () => {
    const r = ref<{ id: number }>({ id: 0 });
    const seen: number[] = [];
    watch(r)
      .distinct((a, b) => a.id === b.id)
      .effect((v) => seen.push(v.id));

    r.value = { id: 1 };
    r.value = { id: 1 }; // skipped — same id as previous
    r.value = { id: 2 };
    r.value = { id: 2 }; // skipped
    r.value = { id: 3 };
    expect(seen).toEqual([1, 2, 3]);
  });

  it("multi-source — emits tuple on any source change", () => {
    const a = ref(1);
    const b = ref("x");
    const seen: Array<[number, string]> = [];
    watch([a, b] as const).effect(([av, bv]) => seen.push([av, bv]));

    a.value = 2;
    b.value = "y";
    expect(seen).toEqual([
      [2, "x"],
      [2, "y"],
    ]);
  });

  it("toRef — produces a ReadonlyRef with transformed initial and live updates", () => {
    const src = ref(5);
    const doubled = watch(src)
      .map((v) => v * 2)
      .toRef();

    expect(doubled.value).toBe(5 * 2); // initial value threads through pipeline
    src.value = 10;
    expect(doubled.value).toBe(20);
  });
});

describe("Philosophy invariant — performance smoke", () => {
  it("1000 ref writes in a batch drain in under the frame budget", () => {
    const refs = Array.from({ length: 1000 }, () => ref(0));
    let fires = 0;
    for (const r of refs) r.subscribe(() => fires++);

    const t0 = performance.now();
    batch(() => {
      for (let i = 0; i < 1000; i++) refs[i].value = i + 1;
    });
    const elapsed = performance.now() - t0;

    expect(fires).toBe(1000);
    // Generous ceiling — the kernel target is < 2ms; CI jitter room allowed.
    expect(elapsed).toBeLessThan(50);
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
