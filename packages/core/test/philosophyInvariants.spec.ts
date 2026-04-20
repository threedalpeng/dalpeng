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
import { ref } from "../src/runtime/reactive";
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
